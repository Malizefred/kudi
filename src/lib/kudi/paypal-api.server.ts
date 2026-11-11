import { env } from "@/lib/env.server";
import { PAYPAL_SANDBOX_CLIENT_ID } from "@/lib/kudi/paypal-public";

const BASE = "https://api-m.sandbox.paypal.com";

type Confirmed = { ok: true; usdCents: number } | { ok: false; error: string };

let cached: { token: string; exp: number } | null = null;

function centsFromValue(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const whole = Number(match[1]);
  const frac = (match[2] ?? "").padEnd(2, "0");
  return whole * 100 + Number(frac);
}

async function accessToken(): Promise<string> {
  const secret = env("PAYPAL_CLIENT_SECRET");
  if (!secret) throw new Error("missing_secret");
  if (cached && cached.exp > Date.now() + 30_000) return cached.token;
  const basic = Buffer.from(`${PAYPAL_SANDBOX_CLIENT_ID}:${secret}`).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("paypal_auth");
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error("paypal_auth");
  cached = { token: body.access_token, exp: Date.now() + (body.expires_in ?? 300) * 1000 };
  return body.access_token;
}

/** Confirm a captured sandbox order with PayPal. The browser is not trusted for this. */
export async function confirmSandboxOrder(orderId: string): Promise<Confirmed> {
  let token: string;
  try {
    token = await accessToken();
  } catch (err) {
    if (err instanceof Error && err.message === "missing_secret") {
      return { ok: false, error: "PayPal is not configured on the server." };
    }
    return { ok: false, error: "PayPal sandbox refused the server login." };
  }
  const res = await fetch(`${BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return { ok: false, error: "PayPal has no order with that id." };
  if (!res.ok) return { ok: false, error: "PayPal could not confirm that order." };
  const order = (await res.json()) as {
    status?: string;
    purchase_units?: { amount?: { currency_code?: string; value?: string } }[];
  };
  if (order.status !== "COMPLETED") return { ok: false, error: "PayPal has not completed that order." };
  const amount = order.purchase_units?.[0]?.amount;
  if (amount?.currency_code !== "USD") return { ok: false, error: "That PayPal order is not in US dollars." };
  const usdCents = centsFromValue(amount.value);
  if (usdCents == null || usdCents <= 0) return { ok: false, error: "PayPal did not return a dollar amount." };
  return { ok: true, usdCents };
}
