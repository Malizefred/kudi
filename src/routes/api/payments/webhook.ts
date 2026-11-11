import { createHmac, timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export const Route = createFileRoute("/api/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.KUDI_WEBHOOK_SECRET;
        if (!secret) {
          return Response.json(
            { ok: false, error: "Webhook secret is not configured. Sandbox orders stay unposted." },
            { status: 501 },
          );
        }
        const raw = await request.text();
        const given = request.headers.get("x-kudi-signature") ?? "";
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        if (!given || !safeEqual(given, expected)) {
          return Response.json({ ok: false, error: "Bad signature." }, { status: 401 });
        }
        let body: { id?: string; type?: string; userId?: string };
        try {
          body = JSON.parse(raw) as { id?: string; type?: string; userId?: string };
        } catch {
          return Response.json({ ok: false, error: "Bad JSON." }, { status: 400 });
        }
        if (body.type !== "payment.sandbox_approved" || !body.id || !body.userId) {
          return Response.json({ ok: false, error: "Unsupported event." }, { status: 400 });
        }
        const sql = await getSql();
        const payment = await sql<{ status: string; usd_cents: number; title: string }>`
          select status, usd_cents, title from kudi_payments where id = ${body.id} and user_id = ${body.userId}
        `;
        const row = payment[0];
        if (!row) return Response.json({ ok: false, error: "Unknown payment." }, { status: 404 });
        if (row.status === "posted") return Response.json({ ok: true, already: true });
        if (row.status === "created") {
          await sql`
            update kudi_payments set status = 'sandbox_approved'
            where id = ${body.id} and user_id = ${body.userId} and status = 'created'
          `;
        }
        const ledgerId = `led_${body.id}`;
        await sql`
          insert into kudi_ledger (id, user_id, payment_id, kind, status, ccy, minor, direction, title, note, idempotency_key)
          values (
            ${ledgerId}, ${body.userId}, ${body.id}, 'topup', 'demo_posted', 'USD', ${row.usd_cents},
            'in', ${row.title || "PayPal sandbox"},
            'Webhook posted this to the demo ledger. Not real funds.',
            ${`paypal:${body.id}`}
          )
          on conflict (user_id, idempotency_key) do nothing
        `;
        await sql`
          update kudi_payments set status = 'posted', ledger_id = ${ledgerId}
          where id = ${body.id} and user_id = ${body.userId}
        `;
        return Response.json({ ok: true, posted: "demo_ledger" });
      },
    },
  },
});
