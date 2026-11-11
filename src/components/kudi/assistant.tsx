import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { askKudi, type AgentTool } from "@/lib/kudi/ask-kudi";
import {
  actionFromDraft,
  describeDraft,
  draftFromIntent,
  formatCcy,
  formatNgn,
  parseIntent,
  uid,
  usdCentsToKobo,
  type ChatMessage,
  type Contact,
  type Intent,
  type MoneyDraft,
} from "@/lib/kudi/model";
import { latestDraft, useKudi } from "@/lib/kudi/store";
import { cn } from "@/components/kudi/ui";

const CHIPS = [
  "What’s my balance?",
  "Send 2,000 to Adaeze for transport",
  "Convert $20 to cedis",
  "Send 50 cedis to Kwame",
  "Buy $25",
];

export function Assistant() {
  const messages = useKudi((s) => s.messages);
  const contacts = useKudi((s) => s.contacts);
  const profile = useKudi((s) => s.profile);
  const balance = useKudi((s) => s.balanceKobo);
  const txns = useKudi((s) => s.txns);
  const pushMessage = useKudi((s) => s.pushMessage);
  const clearDrafts = useKudi((s) => s.clearDrafts);
  const begin = useKudi((s) => s.begin);
  const setTab = useKudi((s) => s.setTab);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  async function submit(raw: string) {
    const value = raw.trim();
    if (!value || busy) return;
    setText("");
    const now = new Date().toISOString();
    pushMessage({ id: uid("msg"), role: "user", text: value, createdAt: now });
    setBusy(true);
    try {
      await answer(value);
    } finally {
      setBusy(false);
    }
  }

  function say(textOut: string, extra?: Partial<ChatMessage>) {
    if (extra?.draft) clearDrafts();
    pushMessage({
      id: uid("msg"),
      role: "assistant",
      text: textOut,
      createdAt: new Date().toISOString(),
      ...extra,
    });
  }

  async function answer(value: string) {
    const state = useKudi.getState();
    const intent = parseIntent(value, state.contacts);

    if (intent.type === "confirm") {
      const draft = latestDraft(state.messages);
      if (!draft) {
        say("Nothing is waiting. Tell me an amount and a name.");
        return;
      }
      clearDrafts();
      const result = begin(actionFromDraft(draft));
      if (!result.ok) {
        say(result.error);
        return;
      }
      const sheet = useKudi.getState().sheet;
      if (sheet?.name === "pin") {
        say("That’s over ₦20,000. Enter your PIN. The demo PIN is 1234.");
      } else if (sheet?.name === "paypal") {
        say("Held for PayPal sandbox approval. Approve the order and it settles.");
      } else if (draft.action === "convert") {
        say("Converted. Both pockets are updated.");
      } else if (draft.action === "request") {
        say(`Asked ${draft.name}. When they pay, mark it in Activity and the naira lands.`);
      } else {
        say("Done. It’s in your activity.");
      }
      return;
    }

    if (intent.type === "cancel") {
      if (!latestDraft(state.messages)) {
        say("Nothing to cancel.");
        return;
      }
      clearDrafts();
      say("Cancelled. Your balance didn’t move.");
      return;
    }

    if (intent.type !== "unclear") {
      sayLocal(intent);
      return;
    }

    const history = useKudi
      .getState()
      .messages.slice(0, -1)
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text.slice(0, 400) }));

    let result: Awaited<ReturnType<typeof askKudi>>;
    try {
      result = await askKudi({
        data: {
          message: value.slice(0, 500),
          history,
          contacts: state.contacts.map((c) => ({
            id: c.id,
            name: c.name,
            aliases: c.aliases,
            city: c.city,
            rail: c.rail,
          })),
          balanceKobo: state.balanceKobo,
        },
      });
    } catch {
      say("I can send, convert, buy dollars, buy airtime, or read your balances. Try “Convert $20 to cedis.”");
      return;
    }

    if (!result.ok) {
      say("I can send, convert, buy dollars, buy airtime, or read your balances. Try “Convert $20 to cedis.”");
      return;
    }

    if (!result.tool || result.tool.name === "get_balance") {
      if (result.tool?.name === "get_balance") {
        say(`You have ${holdings()}.`, { via: "grok" });
        return;
      }
      say(result.text || "Tell me who and how much.", { via: "grok" });
      return;
    }

    if (result.tool.name === "list_activity") {
      say(activityBlurb(), { via: "grok" });
      return;
    }

    const mapped = intentFromTool(result.tool, useKudi.getState().contacts);
    if (mapped.type !== "draft") {
      say(result.text || "Tell me who and how much.", { via: "grok" });
      return;
    }
    const built = draftFromIntent(mapped, useKudi.getState().profile.phone);
    if ("ask" in built) {
      say(result.text || built.ask, { via: "grok" });
      return;
    }
    say(result.text || describeDraft(built), { draft: built, via: "grok" });
  }

  function sayLocal(intent: Intent) {
    const state = useKudi.getState();
    if (intent.type === "balance") {
      say(`You have ${holdings()}.`);
      return;
    }
    if (intent.type === "activity") {
      say(activityBlurb());
      return;
    }
    if (intent.type === "contacts") {
      say(state.contacts.map((c) => `${c.name.split(" ")[0]} · ${c.city}`).join("\n"));
      return;
    }
    if (intent.type === "help" || intent.type === "chitchat") {
      say("Send naira to Adaeze, buy dollars, convert them to cedis, then pay Kwame. Try “Convert $20 to cedis.” Paste a kudi block from Claude or ChatGPT and I’ll hold it for you to confirm.");
      return;
    }
    if (intent.type !== "draft") {
      say("Tell me who and how much.");
      return;
    }
    const built = draftFromIntent(intent, state.profile.phone);
    if ("ask" in built) {
      say(built.ask);
      return;
    }
    say(`${describeDraft(built)} Confirm?`, { draft: built });
  }

  function holdings(): string {
    const state = useKudi.getState();
    return [
      formatNgn(state.balanceKobo),
      formatCcy("USD", state.pockets.USD),
      formatCcy("GHS", state.pockets.GHS),
      formatCcy("KES", state.pockets.KES),
    ].join(" · ");
  }

  function activityBlurb(): string {
    const rows = useKudi.getState().txns.filter((t) => t.status !== "cancelled").slice(0, 3);
    if (rows.length === 0) return "No activity yet.";
    return rows
      .map((t) => {
        const sign = t.direction === "in" ? "+" : "−";
        return `${t.title} ${sign}${t.ccy && t.minor != null ? formatCcy(t.ccy, t.minor) : formatNgn(t.amountKobo)}${t.status === "pending" ? " (waiting)" : ""}`;
      })
      .join("\n");
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <header className="border-b border-line px-4 py-3">
        <h1 className="font-display text-2xl">Talk to Kudi</h1>
        <p className="text-sm text-muted">Same commands as Claude and ChatGPT. You confirm every payment.</p>
      </header>
      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <Bubble
            key={message.id}
            message={message}
            onConfirm={() => void submit("Yes, confirm")}
            onCancel={() => void submit("Cancel")}
          />
        ))}
        {busy ? <p className="text-sm text-muted">Kudi is thinking…</p> : null}
      </div>
      <div className="border-t border-line px-4 pt-2 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="press h-10 shrink-0 rounded-full bg-card px-3 text-xs font-semibold"
              onClick={() => void submit(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(text);
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Message Kudi</span>
            <textarea
              value={text}
              rows={1}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit(text);
                }
              }}
              placeholder={`Send 2,000 to ${contacts[0]?.name.split(" ")[0] ?? "Adaeze"}…`}
              className="max-h-28 w-full resize-none rounded-2xl bg-card px-3 py-3 text-sm outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={busy || text.trim().length === 0}
            className="press flex size-11 items-center justify-center rounded-full bg-leaf text-paper disabled:opacity-40"
            aria-label="Send message"
          >
            <ArrowUp className="size-5" />
          </button>
        </form>
        <button type="button" className="mt-2 text-xs font-medium text-muted" onClick={() => setTab("profile")}>
          {profile.handle} · paste a tool block from your AI · {formatNgn(balance)}
          {txns.some((t) => t.status === "pending") ? " · something is waiting" : ""}
        </button>
      </div>
    </div>
  );
}

function Bubble({
  message,
  onConfirm,
  onCancel,
}: {
  message: ChatMessage;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const mine = message.role === "user";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
          mine ? "bg-leaf text-paper" : "bg-card text-ink",
        )}
      >
        {message.text}
        {message.via === "grok" ? <p className="mt-1 text-xs text-muted">via Grok</p> : null}
        {message.draft ? <DraftCard draft={message.draft} onConfirm={onConfirm} onCancel={onCancel} /> : null}
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  onConfirm,
  onCancel,
}: {
  draft: MoneyDraft;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-2 rounded-xl bg-paper p-3 text-ink">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{toolName(draft)}</p>
      <p className="mt-1 font-semibold tabular-nums">
        {draft.fund && draft.minor != null ? formatCcy(draft.fund, draft.minor) : formatNgn(draft.amountKobo)}
      </p>
      <p className="text-sm">
        {draft.action === "topup"
          ? "Dollar pocket via PayPal"
          : draft.action === "convert"
            ? draft.receiveMinor != null && draft.toCcy
              ? `You get ${formatCcy(draft.toCcy, draft.receiveMinor)}`
              : draft.name
            : draft.action === "airtime"
              ? draft.phone
              : draft.name}
        {draft.action === "send" && draft.receiveCcy && draft.receiveMinor != null && draft.receiveCcy !== draft.fund
          ? ` · gets ${formatCcy(draft.receiveCcy, draft.receiveMinor)}`
          : ""}
      </p>
      {draft.note ? <p className="text-sm text-muted">{draft.note}</p> : null}
      <div className="mt-2 flex gap-2">
        <button type="button" className="press h-10 flex-1 rounded-full bg-leaf text-sm font-semibold text-paper" onClick={onConfirm}>
          Confirm
        </button>
        <button type="button" className="press h-10 flex-1 rounded-full bg-card text-sm font-semibold" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function toolName(draft: MoneyDraft): string {
  if (draft.action === "send") return "send_money";
  if (draft.action === "request") return "request_money";
  if (draft.action === "airtime") return "buy_airtime";
  if (draft.action === "convert") return "convert_money";
  return "buy_dollars";
}

function intentFromTool(tool: AgentTool, contacts: Contact[]): Intent {
  if (tool.name === "get_balance") return { type: "balance" };
  if (tool.name === "list_activity") return { type: "activity" };
  if (tool.name === "topup_paypal") {
    return {
      type: "draft",
      action: "topup",
      amountKobo: tool.amountKobo,
      note: "Added from PayPal",
      missing: tool.amountKobo ? undefined : "amount",
    };
  }
  if (tool.name === "buy_airtime") {
    return {
      type: "draft",
      action: "airtime",
      amountKobo: tool.amountKobo,
      phone: tool.phone,
      network: tool.network ?? "MTN",
      note: "Airtime",
      missing: tool.amountKobo ? undefined : "amount",
    };
  }
  const contact = contacts.find((c) => c.id === tool.contactId);
  const email = tool.nameTo?.includes("@") ? tool.nameTo : undefined;
  const amountKobo = tool.amountKobo ?? (tool.usdCents ? usdCentsToKobo(tool.usdCents) : undefined);
  return {
    type: "draft",
    action: tool.name === "request_money" ? "request" : "send",
    contact,
    email,
    amountKobo,
    usdCents: tool.usdCents,
    note: tool.note ?? "",
    missing: !contact && !email ? "who" : !amountKobo ? "amount" : undefined,
  };
}
