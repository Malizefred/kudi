import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { formatNgn, matchContactSafe } from "@/lib/kudi/resolve";

const ContactIn = z.object({
  id: z.string().max(40),
  name: z.string().max(80),
  aliases: z.array(z.string().max(40)).max(8),
  city: z.string().max(40),
  rail: z.enum(["naira", "paypal"]),
});

const Input = z.object({
  message: z.string().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(400),
      }),
    )
    .max(8),
  contacts: z.array(ContactIn).max(20),
  balanceKobo: z.number().int(),
});

export type AgentTool = {
  name: "send_money" | "request_money" | "buy_airtime" | "topup_paypal" | "get_balance" | "list_activity";
  contactId?: string;
  nameTo?: string;
  amountKobo?: number;
  usdCents?: number;
  note?: string;
  phone?: string;
  network?: string;
};

export type AgentResult =
  | { ok: true; text: string; tool: AgentTool | null }
  | { ok: false; error: string };

const SYSTEM = `You are Kudi, a wallet assistant for people sending and receiving naira.
You never move money yourself. Call a tool when the user wants an action or a fact about their wallet.
Speak in one or two short sentences. Warm, plain, no corporate tone. Match pidgin if they use it.
Currency is Nigerian naira unless they say dollars or a PayPal friend (Kwame in Accra, Zuri in Nairobi), who settle in USD.
If a name or amount is missing, ask one question and do not call a payment tool.
Do not invent people who are not in the contact list.`;

export const askKudi = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<AgentResult> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "unavailable" };

    const people = data.contacts
      .map((c) => `${c.name} (${c.city}, ${c.rail === "paypal" ? "PayPal" : "naira"})`)
      .join("; ");

    const tools = [
      {
        type: "function",
        function: {
          name: "get_balance",
          description: "Read the available naira balance.",
          parameters: { type: "object", properties: {}, additionalProperties: false },
        },
      },
      {
        type: "function",
        function: {
          name: "list_activity",
          description: "Show recent wallet activity.",
          parameters: { type: "object", properties: {}, additionalProperties: false },
        },
      },
      {
        type: "function",
        function: {
          name: "send_money",
          description: "Prepare a transfer the user must confirm. Do not assume it is sent.",
          parameters: {
            type: "object",
            properties: {
              to: { type: "string", description: "Contact name or PayPal email" },
              amount_ngn: { type: "number" },
              amount_usd: { type: "number" },
              note: { type: "string" },
            },
            required: ["to"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "request_money",
          description: "Prepare a request for the user to confirm.",
          parameters: {
            type: "object",
            properties: {
              from: { type: "string" },
              amount_ngn: { type: "number" },
              note: { type: "string" },
            },
            required: ["from", "amount_ngn"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "buy_airtime",
          description: "Prepare an airtime purchase for confirmation.",
          parameters: {
            type: "object",
            properties: {
              phone: { type: "string" },
              amount_ngn: { type: "number" },
              network: { type: "string" },
              for_name: { type: "string" },
            },
            required: ["amount_ngn"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "topup_paypal",
          description: "Prepare a PayPal sandbox top-up for confirmation.",
          parameters: {
            type: "object",
            properties: { amount_ngn: { type: "number" } },
            required: ["amount_ngn"],
            additionalProperties: false,
          },
        },
      },
    ];

    const messages = [
      { role: "system", content: `${SYSTEM}\nBalance: ${formatNgn(data.balanceKobo)}.\nPeople: ${people}.` },
      ...data.history.map((h) => ({ role: h.role, content: h.text })),
      { role: "user", content: data.message },
    ];

    let res: Response;
    try {
      res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          messages,
          tools,
          tool_choice: "auto",
          max_tokens: 280,
          temperature: 0.3,
        }),
      });
    } catch {
      return { ok: false, error: "network" };
    }

    if (!res.ok) return { ok: false, error: `xai-${res.status}` };

    const body = (await res.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: { function?: { name?: string; arguments?: string } }[];
        };
      }[];
    };
    const message = body.choices?.[0]?.message;
    const text = (message?.content ?? "").trim();
    const call = message?.tool_calls?.[0]?.function;
    if (!call?.name) return { ok: true, text: text || "Say who and how much.", tool: null };

    let args: Record<string, unknown> = {};
    try {
      args = call.arguments ? (JSON.parse(call.arguments) as Record<string, unknown>) : {};
    } catch {
      args = {};
    }

    const name = call.name as AgentTool["name"];
    if (name === "get_balance") {
      return {
        ok: true,
        text: text || `You have ${formatNgn(data.balanceKobo)} available.`,
        tool: { name },
      };
    }
    if (name === "list_activity") {
      return { ok: true, text: text || "Here’s the latest on your wallet.", tool: { name } };
    }

    const amountNgn = typeof args.amount_ngn === "number" ? args.amount_ngn : undefined;
    const amountUsd = typeof args.amount_usd === "number" ? args.amount_usd : undefined;
    const amountKobo = amountNgn && amountNgn > 0 ? Math.round(amountNgn * 100) : undefined;
    const usdCents = amountUsd && amountUsd > 0 ? Math.round(amountUsd * 100) : undefined;
    const note = typeof args.note === "string" ? args.note.slice(0, 80) : "";
    const who = String(args.to ?? args.from ?? args.for_name ?? "");
    const contact = who ? matchContactSafe(who, data.contacts) : undefined;

    return {
      ok: true,
      text,
      tool: {
        name,
        contactId: contact?.id,
        nameTo: contact?.name ?? (who || undefined),
        amountKobo,
        usdCents,
        note,
        phone: typeof args.phone === "string" ? args.phone : undefined,
        network: typeof args.network === "string" ? args.network : undefined,
      },
    };
  });
