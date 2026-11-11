import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { PROVIDERS } from "@/lib/kudi/providers";

const Intent = z.object({
  id: z.string().min(4).max(48),
  usdCents: z.number().int().positive().max(5_000_000),
  title: z.string().max(80),
});

export const openSandboxPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => Intent.parse(input))
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const existing = await sql<{ id: string; status: string }>`
      select id, status from kudi_payments where id = ${data.id} and user_id = ${context.userId}
    `;
    if (existing[0]) return { ok: true as const, status: existing[0].status };
    await sql`
      insert into kudi_payments (id, user_id, provider, status, usd_cents, title)
      values (${data.id}, ${context.userId}, ${PROVIDERS.paypal_sandbox.id}, 'created', ${data.usdCents}, ${data.title})
    `;
    return { ok: true as const, status: "created" };
  });

export const markSandboxApproved = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string().min(4).max(48) }).parse(input))
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const rows = await sql<{ status: string }>`
      update kudi_payments
      set status = 'sandbox_approved'
      where id = ${data.id} and user_id = ${context.userId} and status = 'created'
      returning status
    `;
    if (rows[0]) return { ok: true as const, status: "sandbox_approved" as const, posted: false as const };
    const current = await sql<{ status: string }>`
      select status from kudi_payments where id = ${data.id} and user_id = ${context.userId}
    `;
    if (!current[0]) return { ok: false as const, error: "That sandbox order is not on this account." };
    return {
      ok: true as const,
      status: current[0].status,
      posted: current[0].status === "posted",
    };
  });

export const postDemoLedger = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string().min(4).max(48) }).parse(input))
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const payment = await sql<{ status: string; usd_cents: number; title: string }>`
      select status, usd_cents, title from kudi_payments
      where id = ${data.id} and user_id = ${context.userId}
    `;
    const row = payment[0];
    if (!row) return { ok: false as const, error: "That sandbox order is not on this account." };
    if (row.status === "posted") return { ok: true as const, already: true as const, usdCents: row.usd_cents };
    if (row.status !== "sandbox_approved") {
      return { ok: false as const, error: "Approve the sandbox order before it can touch the demo ledger." };
    }
    const ledgerId = `led_${data.id}`;
    await sql`
      insert into kudi_ledger (id, user_id, payment_id, kind, status, ccy, minor, direction, title, note, idempotency_key)
      values (
        ${ledgerId},
        ${context.userId},
        ${data.id},
        'topup',
        'demo_posted',
        'USD',
        ${row.usd_cents},
        'in',
        ${row.title || "PayPal sandbox"},
        'Posted to the demo ledger after sandbox approval. Not real funds.',
        ${`paypal:${data.id}`}
      )
      on conflict (user_id, idempotency_key) do nothing
    `;
    await sql`
      update kudi_payments set status = 'posted', ledger_id = ${ledgerId}
      where id = ${data.id} and user_id = ${context.userId}
    `;
    return { ok: true as const, already: false as const, usdCents: row.usd_cents };
  });

const ProfileIn = z.object({
  displayName: z.string().max(80),
  handle: z.string().max(40),
  country: z.enum(["NG", "KE", "GH", "US"]),
  phone: z.string().max(24),
  identityStatus: z.enum(["not_started", "submitted"]),
});

export const saveKudiProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ProfileIn.parse(input))
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    await sql`
      insert into kudi_profiles (user_id, display_name, handle, country, phone, phone_status, identity_status)
      values (
        ${context.userId},
        ${data.displayName},
        ${data.handle},
        ${data.country},
        ${data.phone},
        'unverified',
        ${data.identityStatus}
      )
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        handle = excluded.handle,
        country = excluded.country,
        phone = excluded.phone,
        identity_status = excluded.identity_status
    `;
    return { ok: true as const };
  });
