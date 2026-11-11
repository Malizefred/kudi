export const NGN_PER_USD = 1550;
export const PIN_THRESHOLD_KOBO = 2_000_000;
export const MIN_SEND_KOBO = 10_000;
export const DEMO_PIN = "1234";

export type Ccy = "NGN" | "USD" | "GHS" | "KES";

export const RATES: Record<Ccy, { name: string; perUsd: number }> = {
  NGN: { name: "Naira", perUsd: NGN_PER_USD },
  USD: { name: "Dollar", perUsd: 1 },
  GHS: { name: "Cedi", perUsd: 15.4 },
  KES: { name: "Shilling", perUsd: 129 },
};

export const CCY_LIST: Ccy[] = ["NGN", "USD", "GHS", "KES"];

export type Rail = "naira" | "paypal";
export type Tone = "leaf" | "ink" | "coral" | "mint";

export type Contact = {
  id: string;
  name: string;
  aliases: string[];
  city: string;
  country: string;
  phone: string;
  rail: Rail;
  /** What this person is paid in. */
  currency: Ccy;
  tone: Tone;
};

export type TxnKind = "send" | "receive" | "request" | "airtime" | "topup" | "fx";
export type TxnStatus = "completed" | "pending" | "cancelled";

export type Txn = {
  id: string;
  kind: TxnKind;
  status: TxnStatus;
  /** Positive amount in the smallest unit of `ccy`, or naira kobo when `ccy` is absent. */
  amountKobo: number;
  ccy?: Ccy;
  minor?: number;
  /** What the other pocket or the recipient received, when it differs. */
  counterCcy?: Ccy;
  counterMinor?: number;
  /** in = money toward you, out = money leaving you. */
  direction: "in" | "out";
  title: string;
  note: string;
  contactId?: string;
  createdAt: string;
  paypalOrderId?: string;
  /** awaiting = created, sandbox_ok = provider approved, posted = demo ledger only */
  paypalPhase?: "awaiting" | "sandbox_ok" | "posted";
  fxLabel?: string;
  phone?: string;
  network?: string;
};

export type Market = "NG" | "KE" | "GH" | "US";

export type Profile = {
  name: string;
  handle: string;
  phone: string;
  city: string;
  pin: string;
  country: Market;
  phoneStatus: "unverified";
  identityStatus: "not_started" | "submitted";
  notify: boolean;
  onboarded: boolean;
};

export type DraftAction = "send" | "request" | "airtime" | "topup" | "convert";

export type MoneyDraft = {
  id: string;
  action: DraftAction;
  contactId?: string;
  name: string;
  amountKobo: number;
  note: string;
  phone?: string;
  network?: string;
  rail: Rail;
  usdCents?: number;
  email?: string;
  /** Pocket the money leaves. */
  fund?: Ccy;
  /** Pocket or person currency that receives the quote. */
  toCcy?: Ccy;
  minor?: number;
  receiveCcy?: Ccy;
  receiveMinor?: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  draft?: MoneyDraft;
  via?: "grok";
  createdAt: string;
};

export type WalletAction =
  | {
      type: "send";
      contactId?: string;
      email?: string;
      name: string;
      amountKobo: number;
      note: string;
      rail: Rail;
      usdCents?: number;
      /** Pocket debited. Defaults to naira. */
      ccy?: Ccy;
      /** Amount debited, in `ccy` minor units. Defaults to amountKobo when naira. */
      minor?: number;
      /** Currency the recipient is quoted in. Defaults to `ccy`. */
      payCcy?: Ccy;
    }
  | {
      type: "request";
      contactId: string;
      name: string;
      amountKobo: number;
      note: string;
      ccy?: Ccy;
      minor?: number;
    }
  | {
      type: "airtime";
      phone: string;
      network: string;
      amountKobo: number;
      name: string;
    }
  | { type: "topup"; usdCents: number }
  | { type: "convert"; from: Ccy; to: Ccy; minor: number }
  | { type: "payRequest"; txnId: string }
  | { type: "collectRequest"; txnId: string };

export const CONTACTS: Contact[] = [
  {
    id: "adaeze",
    name: "Adaeze Okonkwo",
    aliases: ["adaeze", "ada"],
    city: "Lagos",
    country: "Nigeria",
    phone: "0803 441 2291",
    rail: "naira",
    currency: "NGN",
    tone: "leaf",
  },
  {
    id: "chidi",
    name: "Chidi Eze",
    aliases: ["chidi"],
    city: "Enugu",
    country: "Nigeria",
    phone: "0806 220 1184",
    rail: "naira",
    currency: "NGN",
    tone: "ink",
  },
  {
    id: "mama",
    name: "Mama Ngozi",
    aliases: ["mama", "mum", "mommy", "ngozi"],
    city: "Onitsha",
    country: "Nigeria",
    phone: "0805 112 9033",
    rail: "naira",
    currency: "NGN",
    tone: "coral",
  },
  {
    id: "amina",
    name: "Amina Yusuf",
    aliases: ["amina"],
    city: "Kano",
    country: "Nigeria",
    phone: "0809 334 7761",
    rail: "naira",
    currency: "NGN",
    tone: "mint",
  },
  {
    id: "kwame",
    name: "Kwame Mensah",
    aliases: ["kwame"],
    city: "Accra",
    country: "Ghana",
    phone: "024 412 8801",
    rail: "naira",
    currency: "GHS",
    tone: "ink",
  },
  {
    id: "zuri",
    name: "Zuri Wanjiku",
    aliases: ["zuri"],
    city: "Nairobi",
    country: "Kenya",
    phone: "0712 440 229",
    rail: "naira",
    currency: "KES",
    tone: "leaf",
  },
];

export const AI_PROMPT = `You are connected to Kudi, a wallet for naira, dollars, Ghana cedis, and Kenya shillings. The person still confirms every payment inside Kudi before money moves.

When they want to pay, convert, request, buy airtime, buy dollars, or check money, answer in one or two short sentences and include a fenced block exactly like this:

\`\`\`kudi
{"tool":"send_money","to":"Adaeze","amount_ngn":2000,"note":"transport"}
\`\`\`

Tools:
- get_balance
- list_activity
- send_money — to, amount_ngn or amount_usd or amount + currency (NGN, USD, GHS, KES), note
- convert_money — amount, from, to (NGN, USD, GHS, KES)
- request_money — from, amount_ngn, note
- buy_airtime — phone, amount_ngn, network (MTN, Airtel, Glo, 9mobile)
- buy_dollars — amount_usd (PayPal sandbox, lands in the dollar pocket)

People: Adaeze, Chidi, Mama, and Amina are paid in naira. Kwame in Accra is paid in cedis. Zuri in Nairobi is paid in shillings. A PayPal email is paid in dollars.
Demo rates, no fee: 1 USD = ₦1,550 = ₵15.40 = KSh 129.
Never invent a payment. If a name, amount, or currency pair is missing, ask one question. Pidgin is welcome when they use it.`;

export function formatNgn(kobo: number): string {
  const sign = kobo < 0 ? "−" : "";
  const abs = Math.abs(Math.round(kobo));
  const naira = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}₦${naira.toLocaleString("en-NG")}.${String(rem).padStart(2, "0")}`;
}

export function formatUsd(cents: number): string {
  return formatCcy("USD", cents);
}

export function formatCcy(code: Ccy, minor: number): string {
  const sign = minor < 0 ? "−" : "";
  const abs = Math.abs(Math.round(minor));
  const major = Math.floor(abs / 100);
  const rem = String(abs % 100).padStart(2, "0");
  const body = `${major.toLocaleString("en-US")}.${rem}`;
  if (code === "NGN") return `${sign}₦${major.toLocaleString("en-NG")}.${rem}`;
  if (code === "USD") return `${sign}$${body}`;
  if (code === "GHS") return `${sign}₵${body}`;
  return `${sign}KSh ${body}`;
}

export function formatTxnAmount(txn: { amountKobo: number; ccy?: Ccy; minor?: number }): string {
  if (txn.ccy && txn.minor != null) return formatCcy(txn.ccy, txn.minor);
  return formatNgn(txn.amountKobo);
}

export function toUsdCents(code: Ccy, minor: number): number {
  const major = minor / 100;
  return Math.round((major / RATES[code].perUsd) * 100);
}

export function fromUsdCents(code: Ccy, usdCents: number): number {
  return Math.round((usdCents / 100) * RATES[code].perUsd * 100);
}

export function convertMinor(from: Ccy, to: Ccy, minor: number): number {
  if (from === to) return Math.round(minor);
  return fromUsdCents(to, toUsdCents(from, minor));
}

export function minMinor(code: Ccy): number {
  if (code === "NGN") return MIN_SEND_KOBO;
  return Math.max(100, convertMinor("NGN", code, MIN_SEND_KOBO));
}

export function rateLine(from: Ccy, to: Ccy): string {
  const quoted = convertMinor(from, to, 100);
  if (quoted >= 100) return `1 ${from} = ${formatCcy(to, quoted)}`;
  return `1 ${to} = ${formatCcy(from, convertMinor(to, from, 100))}`;
}

export function koboToUsdCents(kobo: number): number {
  return toUsdCents("NGN", kobo);
}

export function usdCentsToKobo(cents: number): number {
  return Math.round((cents / 100) * NGN_PER_USD * 100);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function dayLabel(iso: string, now = new Date()): string {
  const key = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  const today = key(now);
  const yesterday = key(new Date(now.getTime() - 86_400_000));
  const stamp = key(new Date(iso));
  if (stamp === today) return "Today";
  if (stamp === yesterday) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  });
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
    timeZone: "Africa/Lagos",
  });
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function paypalOrderId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let body = "";
  for (let i = 0; i < 10; i += 1) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `KUDI-SANDBOX-${body}`;
}

export function seedTxns(): Txn[] {
  return [
    {
      id: "txn_seed_amina",
      kind: "request",
      status: "pending",
      amountKobo: 350_000,
      direction: "out",
      title: "Amina Yusuf",
      note: "Suya run",
      contactId: "amina",
      createdAt: "2026-11-02T22:10:00.000Z",
    },
    {
      id: "txn_seed_mama",
      kind: "receive",
      status: "completed",
      amountKobo: 2_500_000,
      direction: "in",
      title: "Mama Ngozi",
      note: "Market money",
      contactId: "mama",
      createdAt: "2026-11-02T08:00:00.000Z",
    },
    {
      id: "txn_seed_chidi",
      kind: "send",
      status: "completed",
      amountKobo: 450_000,
      direction: "out",
      title: "Chidi Eze",
      note: "Light bill",
      contactId: "chidi",
      createdAt: "2026-11-01T16:00:00.000Z",
    },
    {
      id: "txn_seed_airtime",
      kind: "airtime",
      status: "completed",
      amountKobo: 100_000,
      direction: "out",
      title: "MTN airtime",
      note: "My line",
      phone: "0803 555 0142",
      network: "MTN",
      createdAt: "2026-11-01T12:00:00.000Z",
    },
    {
      id: "txn_seed_topup",
      kind: "topup",
      status: "completed",
      amountKobo: 5_000_000,
      direction: "in",
      title: "PayPal sandbox",
      note: "Added to wallet",
      paypalOrderId: "KUDI-SANDBOX-DEMO4TOPUP",
      fxLabel: formatUsd(koboToUsdCents(5_000_000)),
      createdAt: "2026-10-31T09:00:00.000Z",
    },
  ];
}

export function openingMessage(name: string): ChatMessage {
  const first = name.split(" ")[0] || "there";
  return {
    id: "msg_hello",
    role: "assistant",
    text: `How far, ${first}. You can hold naira, dollars, cedis, and shillings. Try “Send 2,000 to Adaeze”, “Convert $20 to cedis”, or “Send 50 cedis to Kwame.” You confirm before anything moves.`,
    createdAt: "2026-11-02T09:00:00.000Z",
  };
}

const TONE_CLASS: Record<Tone, string> = {
  leaf: "bg-leaf text-paper",
  ink: "bg-ink text-paper",
  coral: "bg-coral text-paper",
  mint: "bg-mint text-ink",
};

export function toneClass(tone: Tone): string {
  return TONE_CLASS[tone];
}

export type Intent =
  | { type: "balance" }
  | { type: "activity" }
  | { type: "contacts" }
  | { type: "help" }
  | { type: "confirm" }
  | { type: "cancel" }
  | { type: "chitchat" }
  | { type: "unclear" }
  | {
      type: "draft";
      action: DraftAction;
      contact?: Contact;
      email?: string;
      amountKobo?: number;
      usdCents?: number;
      note: string;
      phone?: string;
      network?: string;
      missing?: "who" | "amount" | "phone" | "currency";
      fund?: Ccy;
      toCcy?: Ccy;
      minor?: number;
      receiveCcy?: Ccy;
    };

function matchContact(text: string, contacts: Contact[]): Contact | undefined {
  const hay = text.toLowerCase();
  let best: { contact: Contact; len: number } | undefined;
  for (const contact of contacts) {
    const keys = [contact.name, ...contact.aliases];
    for (const key of keys) {
      const al = key.toLowerCase();
      if (al.length < 3) continue;
      const hit = new RegExp(`(^|[^a-z])${al}([^a-z]|$)`, "i").test(hay);
      if (hit && (!best || al.length > best.len)) best = { contact, len: al.length };
    }
  }
  return best?.contact;
}

function moneyFrom(text: string): { minor?: number; ccy?: Ccy } {
  const stripped = text.replace(/\b0\d{9,10}\b/g, " ").replace(/,/g, "");
  const usd = stripped.match(/(?:\$|usd)\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*(?:usd|dollars)\b/i);
  if (usd) {
    const n = Number(usd[1] ?? usd[2]);
    if (Number.isFinite(n) && n > 0) return { ccy: "USD", minor: Math.round(n * 100) };
  }
  const ghs = stripped.match(/(?:₵|ghs)\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*(?:ghs|cedis)\b/i);
  if (ghs) {
    const n = Number(ghs[1] ?? ghs[2]);
    if (Number.isFinite(n) && n > 0) return { ccy: "GHS", minor: Math.round(n * 100) };
  }
  const kes = stripped.match(/(?:ksh|kes)\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*(?:kes|ksh|shillings)\b/i);
  if (kes) {
    const n = Number(kes[1] ?? kes[2]);
    if (Number.isFinite(n) && n > 0) return { ccy: "KES", minor: Math.round(n * 100) };
  }
  const k = stripped.match(/(\d+(?:\.\d+)?)\s*(k|thousand)\b/i);
  if (k) {
    const naira = Number(k[1]) * 1000;
    if (Number.isFinite(naira) && naira > 0) return { ccy: "NGN", minor: Math.round(naira * 100) };
  }
  const named = stripped.match(/(?:₦|ngn)\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*(?:naira|ngn)\b/i);
  if (named) {
    const naira = Number(named[1] ?? named[2]);
    if (Number.isFinite(naira) && naira > 0) return { ccy: "NGN", minor: Math.round(naira * 100) };
  }
  const bare = stripped.match(/(\d+(?:\.\d{1,2})?)/);
  if (!bare) return {};
  const naira = Number(bare[1]);
  if (!Number.isFinite(naira) || naira <= 0) return {};
  return { ccy: "NGN", minor: Math.round(naira * 100) };
}

function mentionedCcys(text: string): Ccy[] {
  const hits: { i: number; ccy: Ccy }[] = [];
  const patterns: [RegExp, Ccy][] = [
    [/dollars?|usd|\$/gi, "USD"],
    [/cedis?|ghs|₵/gi, "GHS"],
    [/shillings?|kes|ksh/gi, "KES"],
    [/naira|ngn|₦/gi, "NGN"],
  ];
  for (const [re, ccy] of patterns) {
    for (const match of text.matchAll(re)) {
      if (match.index != null) hits.push({ i: match.index, ccy });
    }
  }
  hits.sort((a, b) => a.i - b.i);
  const out: Ccy[] = [];
  for (const hit of hits) if (!out.includes(hit.ccy)) out.push(hit.ccy);
  return out;
}

export function parseCcy(value: unknown): Ccy | undefined {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "NGN" || raw === "NAIRA") return "NGN";
  if (raw === "USD" || raw === "DOLLAR" || raw === "DOLLARS") return "USD";
  if (raw === "GHS" || raw === "CEDI" || raw === "CEDIS") return "GHS";
  if (raw === "KES" || raw === "SHILLING" || raw === "SHILLINGS") return "KES";
  return undefined;
}

function noteFrom(text: string): string {
  const m = text.match(/\bfor\s+(.+)$/i);
  if (!m) return "";
  return m[1].replace(/[.?!]+$/, "").trim().slice(0, 80);
}

function phoneFrom(text: string): string | undefined {
  const m = text.match(/\b(0\d{10})\b/);
  if (!m) return undefined;
  const d = m[1];
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

function networkFrom(text: string): string | undefined {
  const m = text.match(/\b(mtn|airtel|glo|9mobile|etisalat)\b/i);
  if (!m) return undefined;
  const raw = m[1].toLowerCase();
  if (raw === "mtn") return "MTN";
  if (raw === "airtel") return "Airtel";
  if (raw === "glo") return "Glo";
  return "9mobile";
}

function toolFromJson(text: string, contacts: Contact[]): Intent | null {
  const fence = text.match(/```kudi\s*([\s\S]*?)```/i);
  const raw = fence?.[1] ?? text.match(/\{[\s\S]*"tool"[\s\S]*\}/)?.[0];
  if (!raw) return null;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { type: "unclear" };
  }
  const tool = String(data.tool ?? "");
  const note = typeof data.note === "string" ? data.note.slice(0, 80) : "";
  const amountNgn = typeof data.amount_ngn === "number" ? data.amount_ngn : undefined;
  const amountUsd = typeof data.amount_usd === "number" ? data.amount_usd : undefined;
  const who = String(data.to ?? data.from ?? "");
  const contact = who ? matchContact(who, contacts) : undefined;
  const amountPlain = typeof data.amount === "number" ? data.amount : undefined;
  const ccyNamed = parseCcy(data.currency ?? data.from);
  const toNamed = parseCcy(data.to);
  let amountKobo = amountNgn && amountNgn > 0 ? Math.round(amountNgn * 100) : undefined;
  let usdCents = amountUsd && amountUsd > 0 ? Math.round(amountUsd * 100) : undefined;
  if (usdCents && !amountKobo) amountKobo = usdCentsToKobo(usdCents);
  if (tool === "get_balance") return { type: "balance" };
  if (tool === "list_activity") return { type: "activity" };
  if (tool === "convert_money") {
    const from = parseCcy(data.from);
    const to = parseCcy(data.to);
    const minor = amountPlain && amountPlain > 0 ? Math.round(amountPlain * 100) : undefined;
    return {
      type: "draft",
      action: "convert",
      fund: from,
      toCcy: to,
      minor,
      note,
      missing: !from || !to || from === to ? "currency" : !minor ? "amount" : undefined,
    };
  }
  if (tool === "buy_dollars" || tool === "topup_paypal") {
    const dollars = usdCents ?? (amountPlain && amountPlain > 0 ? Math.round(amountPlain * 100) : undefined);
    return {
      type: "draft",
      action: "topup",
      usdCents: dollars,
      minor: dollars,
      fund: "USD",
      amountKobo: dollars ? usdCentsToKobo(dollars) : amountKobo,
      note: note || "Buy dollars",
      missing: dollars || amountKobo ? undefined : "amount",
    };
  }
  if (tool === "buy_airtime") {
    const phone = typeof data.phone === "string" ? data.phone : undefined;
    const network = typeof data.network === "string" ? data.network : "MTN";
    return {
      type: "draft",
      action: "airtime",
      amountKobo,
      note,
      phone,
      network,
      missing: !amountKobo ? "amount" : undefined,
    };
  }
  if (tool === "send_money" || tool === "request_money") {
    const action = tool === "send_money" ? "send" : "request";
    const explicit = ccyNamed && ccyNamed !== toNamed ? ccyNamed : parseCcy(data.currency);
    const fund = explicit ?? (usdCents ? "USD" : "NGN");
    const minor =
      fund === "USD" && usdCents
        ? usdCents
        : explicit && amountPlain && amountPlain > 0
          ? Math.round(amountPlain * 100)
          : amountKobo;
    const receiveCcy = contact?.currency ?? (typeof data.email === "string" ? "USD" : fund);
    return {
      type: "draft",
      action,
      contact,
      amountKobo: minor ? convertMinor(fund, "NGN", minor) : undefined,
      usdCents: fund === "USD" ? minor : usdCents,
      fund,
      minor,
      receiveCcy: action === "send" ? receiveCcy : undefined,
      note,
      email: typeof data.email === "string" ? data.email : undefined,
      missing: action === "request" ? (!contact ? "who" : !amountKobo ? "amount" : undefined) : !contact && !data.email ? "who" : !minor ? "amount" : undefined,
    };
  }
  return { type: "unclear" };
}

export function parseIntent(text: string, contacts: Contact[]): Intent {
  const trimmed = text.trim();
  const fromTool = toolFromJson(trimmed, contacts);
  if (fromTool) return fromTool;

  const lower = trimmed.toLowerCase();
  if (/^(yes|yeah|yep|confirm|send it|go ahead|do it|abeg do am|ok send|okay send|pay it)\b/.test(lower)) {
    return { type: "confirm" };
  }
  if (/^(no|nope|cancel|stop|never mind|nevermind|leave am|don't|dont)\b/.test(lower)) {
    return { type: "cancel" };
  }
  if (/\b(balance|how much (do )?i (get|have)|wetin i get|my money|available)\b/.test(lower)) {
    return { type: "balance" };
  }
  if (/\b(transactions|history|activity|statement|who did i)\b/.test(lower)) {
    return { type: "activity" };
  }
  if (/\b(contacts|who can i (pay|send)|people)\b/.test(lower)) {
    return { type: "contacts" };
  }
  if (/^(hi|hello|hey|how far|good morning|good evening|yo|abeg)\b/.test(lower) && !/\d/.test(lower)) {
    return { type: "chitchat" };
  }
  if (/\b(help|what can you|how (do|does) this)\b/.test(lower)) return { type: "help" };

  const contact = matchContact(lower, contacts);
  const email = trimmed.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0];
  const money = moneyFrom(lower);
  const note = noteFrom(trimmed);
  const kobo = money.ccy === "NGN" ? money.minor : money.minor ? convertMinor(money.ccy ?? "NGN", "NGN", money.minor) : undefined;

  if (/\b(airtime|recharge)\b/.test(lower)) {
    const phone = phoneFrom(trimmed);
    const network = networkFrom(lower) ?? "MTN";
    const airtime = money.ccy === "NGN" || !money.ccy ? money.minor : kobo;
    return {
      type: "draft",
      action: "airtime",
      amountKobo: airtime,
      note,
      phone,
      network,
      contact,
      missing: airtime ? undefined : "amount",
    };
  }
  if (
    /\b(convert|exchange|swap)\b/.test(lower) ||
    (/\b(turn|change)\b/.test(lower) && /\b(to|into)\b/.test(lower) && mentionedCcys(lower).length > 0)
  ) {
    const mentioned = mentionedCcys(lower);
    const from = money.ccy ?? mentioned[0];
    const to = mentioned.find((code) => code !== from);
    return {
      type: "draft",
      action: "convert",
      fund: from,
      toCcy: to,
      minor: money.minor,
      note,
      missing: !from || !to ? "currency" : !money.minor ? "amount" : undefined,
    };
  }
  if (/\b(top\s*up|add money|fund (my )?wallet|add cash|buy dollars|add dollars)\b/.test(lower) || (/\bbuy\b/.test(lower) && /(?:dollars?|\busd\b|\$)/.test(lower))) {
    const usdCents = money.ccy === "USD" ? money.minor : money.ccy === "NGN" && money.minor ? koboToUsdCents(money.minor) : undefined;
    return {
      type: "draft",
      action: "topup",
      amountKobo: usdCents ? usdCentsToKobo(usdCents) : undefined,
      usdCents,
      minor: usdCents,
      fund: "USD",
      note: note || "Buy dollars",
      missing: usdCents ? undefined : "amount",
    };
  }
  if (/\b(request|collect|ask .* (for|to send)|i wan collect)\b/.test(lower)) {
    const naira = money.ccy === "NGN" ? money.minor : undefined;
    return {
      type: "draft",
      action: "request",
      contact,
      amountKobo: naira,
      note,
      missing: !contact ? "who" : !naira ? "amount" : undefined,
    };
  }
  if (
    /\b(send|transfer|pay|dash|wire)\b/.test(lower) ||
    (money.minor && (contact || email))
  ) {
    const receiveCcy = contact?.currency ?? (email ? "USD" : "NGN");
    const fund = money.ccy ?? receiveCcy;
    return {
      type: "draft",
      action: "send",
      contact,
      email,
      fund,
      minor: money.minor,
      receiveCcy,
      amountKobo: money.minor ? convertMinor(fund, "NGN", money.minor) : undefined,
      usdCents: fund === "USD" ? money.minor : undefined,
      note,
      missing: !contact && !email ? "who" : !money.minor ? "amount" : undefined,
    };
  }
  return { type: "unclear" };
}

export function draftFromIntent(intent: Extract<Intent, { type: "draft" }>, myPhone: string): MoneyDraft | { ask: string } {
  if (intent.missing === "currency") {
    return { ask: "Which two currencies? Try “Convert $20 to cedis.”" };
  }
  if (intent.missing === "who") {
    return {
      ask:
        intent.action === "request"
          ? "Who should I ask? Adaeze, Chidi, Mama, Amina, Kwame, or Zuri."
          : "Who should get it? Try a name — Adaeze, Mama, Kwame…",
    };
  }
  if (intent.action === "convert") {
    if (!intent.fund || !intent.toCcy || intent.fund === intent.toCcy) {
      return { ask: "Which two currencies? Try “Convert $20 to cedis.”" };
    }
    if (!intent.minor) return { ask: "How much should I convert?" };
    const receiveMinor = convertMinor(intent.fund, intent.toCcy, intent.minor);
    return {
      id: uid("draft"),
      action: "convert",
      name: `${RATES[intent.fund].name} to ${RATES[intent.toCcy].name}`,
      amountKobo: convertMinor(intent.fund, "NGN", intent.minor),
      note: rateLine(intent.fund, intent.toCcy),
      rail: "naira",
      fund: intent.fund,
      toCcy: intent.toCcy,
      minor: intent.minor,
      receiveCcy: intent.toCcy,
      receiveMinor,
    };
  }
  if (intent.action === "topup") {
    const usdCents = intent.usdCents ?? intent.minor ?? (intent.amountKobo ? koboToUsdCents(intent.amountKobo) : undefined);
    if (!usdCents) return { ask: "How many dollars should I buy? Try $25." };
    return {
      id: uid("draft"),
      action: "topup",
      name: "PayPal sandbox",
      amountKobo: usdCentsToKobo(usdCents),
      note: intent.note || "Buy dollars",
      rail: "paypal",
      usdCents,
      fund: "USD",
      minor: usdCents,
    };
  }
  if (intent.missing === "amount") {
    return { ask: "How much? Try 2,000 naira, $10, or 50 cedis." };
  }
  if (intent.action === "airtime") {
    if (!intent.amountKobo) return { ask: "How much airtime, in naira?" };
    const phone = intent.phone ?? intent.contact?.phone ?? myPhone;
    const network = intent.network ?? "MTN";
    return {
      id: uid("draft"),
      action: "airtime",
      contactId: intent.contact?.id,
      name: intent.phone ? `${network} ${phone}` : (intent.contact?.name ?? "My line"),
      amountKobo: intent.amountKobo,
      note: intent.note || `${network} airtime`,
      phone,
      network,
      rail: "naira",
    };
  }
  if (intent.action === "request") {
    if (!intent.amountKobo) return { ask: "How many naira should I ask for?" };
    return {
      id: uid("draft"),
      action: "request",
      contactId: intent.contact?.id,
      name: intent.contact?.name ?? "Someone",
      amountKobo: intent.amountKobo,
      note: intent.note,
      rail: "naira",
    };
  }
  const contact = intent.contact;
  const receiveCcy = intent.receiveCcy ?? contact?.currency ?? (intent.email ? "USD" : "NGN");
  const fund = intent.fund ?? receiveCcy;
  const minor = intent.minor ?? (fund === "NGN" ? intent.amountKobo : undefined);
  if (!minor) return { ask: "How much? Try 2,000 naira, $10, or 50 cedis." };
  const receiveMinor = convertMinor(fund, receiveCcy, minor);
  return {
    id: uid("draft"),
    action: "send",
    contactId: contact?.id,
    email: intent.email,
    name: contact?.name ?? intent.email ?? "Someone",
    amountKobo: convertMinor(fund, "NGN", minor),
    note: intent.note,
    rail: intent.email ? "paypal" : "naira",
    usdCents: fund === "USD" ? minor : undefined,
    fund,
    toCcy: receiveCcy,
    minor,
    receiveCcy,
    receiveMinor,
  };
}

export function describeDraft(draft: MoneyDraft): string {
  if (draft.action === "convert" && draft.fund && draft.toCcy && draft.minor != null && draft.receiveMinor != null) {
    return `Convert ${formatCcy(draft.fund, draft.minor)} into ${formatCcy(draft.toCcy, draft.receiveMinor)}.`;
  }
  if (draft.action === "topup") {
    return `Buy ${formatUsd(draft.usdCents ?? draft.minor ?? 0)} with PayPal. It lands in your dollar pocket.`;
  }
  if (draft.action === "airtime") {
    return `Buy ${formatNgn(draft.amountKobo)} ${draft.network ?? "MTN"} airtime for ${draft.phone ?? draft.name}.`;
  }
  if (draft.action === "request") {
    return `Ask ${draft.name} for ${formatNgn(draft.amountKobo)}${draft.note ? ` — ${draft.note}` : ""}.`;
  }
  const paid = draft.fund && draft.minor != null ? formatCcy(draft.fund, draft.minor) : formatNgn(draft.amountKobo);
  const got =
    draft.receiveCcy && draft.receiveMinor != null && draft.receiveCcy !== draft.fund
      ? ` ${draft.name.split(" ")[0]} gets ${formatCcy(draft.receiveCcy, draft.receiveMinor)}.`
      : draft.rail === "paypal" && draft.usdCents
        ? ` They get ${formatUsd(draft.usdCents)} on PayPal.`
        : "";
  return `Send ${paid} to ${draft.name}${draft.note ? ` for ${draft.note}` : ""}.${got}`;
}

export function actionFromDraft(draft: MoneyDraft): WalletAction {
  if (draft.action === "convert" && draft.fund && draft.toCcy && draft.minor != null) {
    return { type: "convert", from: draft.fund, to: draft.toCcy, minor: draft.minor };
  }
  if (draft.action === "topup") {
    return { type: "topup", usdCents: draft.usdCents ?? draft.minor ?? koboToUsdCents(draft.amountKobo) };
  }
  if (draft.action === "airtime") {
    return {
      type: "airtime",
      phone: draft.phone ?? "",
      network: draft.network ?? "MTN",
      amountKobo: draft.amountKobo,
      name: draft.name,
    };
  }
  if (draft.action === "request" && draft.contactId) {
    return {
      type: "request",
      contactId: draft.contactId,
      name: draft.name,
      amountKobo: draft.amountKobo,
      note: draft.note,
    };
  }
  const ccy = draft.fund ?? (draft.rail === "paypal" ? "USD" : "NGN");
  const minor = draft.minor ?? (ccy === "USD" ? draft.usdCents : draft.amountKobo) ?? draft.amountKobo;
  return {
    type: "send",
    contactId: draft.contactId,
    email: draft.email,
    name: draft.name,
    amountKobo: draft.amountKobo,
    note: draft.note,
    rail: draft.rail,
    usdCents: draft.usdCents,
    ccy,
    minor,
    payCcy: draft.receiveCcy ?? ccy,
  };
}
