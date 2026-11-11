import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  CONTACTS,
  DEMO_PIN,
  MIN_SEND_KOBO,
  PIN_THRESHOLD_KOBO,
  RATES,
  convertMinor,
  formatCcy,
  formatNgn,
  formatUsd,
  minMinor,
  openingMessage,
  paypalOrderId,
  rateLine,
  seedTxns,
  uid,
  usdCentsToKobo,
  type Ccy,
  type ChatMessage,
  type Contact,
  type MoneyDraft,
  type Profile,
  type Txn,
  type WalletAction,
} from "@/lib/kudi/model";

export type Sheet =
  | null
  | { name: "send"; contactId?: string; ccy?: Ccy }
  | { name: "request"; contactId?: string }
  | { name: "airtime" }
  | { name: "topup" }
  | { name: "convert"; from?: Ccy; to?: Ccy }
  | { name: "pin" }
  | { name: "paypal"; txnId: string }
  | { name: "receive" }
  | { name: "detail"; txnId: string }
  | { name: "success"; txnId: string };

type Tab = "home" | "wallets" | "exchange" | "activity" | "profile" | "chat";

export type Pockets = { USD: number; GHS: number; KES: number };

type KudiState = {
  profile: Profile;
  balanceKobo: number;
  pockets: Pockets;
  balanceHidden: boolean;
  contacts: Contact[];
  txns: Txn[];
  messages: ChatMessage[];
  tab: Tab;
  wallet: Ccy | null;
  sheet: Sheet;
  pinFor: WalletAction | null;
  formError: string | null;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  setTab: (tab: Tab) => void;
  openWallet: (code: Ccy) => void;
  closeWallet: () => void;
  setSheet: (sheet: Sheet) => void;
  toggleHidden: () => void;
  setProfile: (patch: Partial<Profile>) => void;
  pushMessage: (message: ChatMessage) => void;
  clearDrafts: () => void;
  begin: (action: WalletAction) => { ok: true } | { ok: false; error: string };
  submitPin: (pin: string) => { ok: true } | { ok: false; error: string };
  cancelPin: () => void;
  approvePaypal: (txnId: string, paypalOrderId?: string, usdCents?: number) => void;
  postDemo: (txnId: string) => void;
  cancelPaypal: (txnId: string) => void;
  declineRequest: (txnId: string) => void;
};

export const SEED_POCKETS: Pockets = { USD: 4_000, GHS: 2_500, KES: 50_000 };

function held(balanceKobo: number, pockets: Pockets, ccy: Ccy): number {
  if (ccy === "NGN") return balanceKobo;
  return pockets[ccy];
}

function withHeld(balanceKobo: number, pockets: Pockets, ccy: Ccy, next: number): { balanceKobo: number; pockets: Pockets } {
  if (ccy === "NGN") return { balanceKobo: next, pockets };
  return { balanceKobo, pockets: { ...pockets, [ccy]: next } };
}

function sendParts(action: Extract<WalletAction, { type: "send" }>): { ccy: Ccy; minor: number; payCcy: Ccy } {
  const ccy = action.ccy ?? (action.rail === "paypal" ? "USD" : "NGN");
  const minor = action.minor ?? (ccy === "NGN" ? action.amountKobo : (action.usdCents ?? action.amountKobo));
  return { ccy, minor, payCcy: action.payCcy ?? ccy };
}

function needsPin(action: WalletAction, txns: Txn[]): boolean {
  if (action.type === "send") {
    const { ccy, minor } = sendParts(action);
    return convertMinor(ccy, "NGN", minor) >= PIN_THRESHOLD_KOBO;
  }
  if (action.type === "airtime") return action.amountKobo >= PIN_THRESHOLD_KOBO;
  if (action.type === "convert") return convertMinor(action.from, "NGN", action.minor) >= PIN_THRESHOLD_KOBO;
  if (action.type === "payRequest") {
    const txn = txns.find((t) => t.id === action.txnId);
    const minor = txn?.minor ?? txn?.amountKobo ?? 0;
    const ccy = txn?.ccy ?? "NGN";
    return convertMinor(ccy, "NGN", minor) >= PIN_THRESHOLD_KOBO;
  }
  return false;
}

function validate(action: WalletAction, state: KudiState): string | null {
  if (action.type === "topup") {
    if (action.usdCents < 100) return "Minimum buy is $1.00.";
    return null;
  }
  if (action.type === "convert") {
    if (action.from === action.to) return "Pick two different currencies.";
    if (action.minor < minMinor(action.from)) return `Minimum is ${formatCcy(action.from, minMinor(action.from))}.`;
    const have = held(state.balanceKobo, state.pockets, action.from);
    if (action.minor > have) return `You have ${formatCcy(action.from, have)}. That’s not enough.`;
    return null;
  }
  if (action.type === "send") {
    if (!action.name.trim()) return "Add a recipient.";
    if (action.rail === "paypal" && !action.email?.includes("@")) return "Use a PayPal email for dollar sends outside Kudi.";
    const { ccy, minor } = sendParts(action);
    if (minor < minMinor(ccy)) return `Minimum is ${formatCcy(ccy, minMinor(ccy))}.`;
    const have = held(state.balanceKobo, state.pockets, ccy);
    if (minor > have) return `You have ${formatCcy(ccy, have)}. That’s not enough.`;
    return null;
  }
  if (action.type === "request") {
    if (!action.contactId) return "Pick someone to ask.";
    const ccy = action.ccy ?? "NGN";
    const minor = action.minor ?? action.amountKobo;
    if (minor < minMinor(ccy)) return `Minimum is ${formatCcy(ccy, minMinor(ccy))}.`;
    return null;
  }
  if (action.type === "airtime" && action.amountKobo < MIN_SEND_KOBO) {
    return `Minimum is ${formatNgn(MIN_SEND_KOBO)}.`;
  }
  if (action.type === "airtime" && action.amountKobo > state.balanceKobo) {
    return `You have ${formatNgn(state.balanceKobo)}. That’s not enough.`;
  }
  if (action.type === "payRequest") {
    const txn = state.txns.find((t) => t.id === action.txnId);
    if (!txn || txn.status !== "pending" || txn.direction !== "out") return "That request is already closed.";
    const ccy = txn.ccy ?? "NGN";
    const minor = txn.minor ?? txn.amountKobo;
    const have = held(state.balanceKobo, state.pockets, ccy);
    if (minor > have) return `You have ${formatCcy(ccy, have)}. That’s not enough.`;
  }
  return null;
}

function apply(state: KudiState, action: WalletAction): { balanceKobo: number; pockets: Pockets; txns: Txn[]; sheet: Sheet } | { error: string } {
  const error = validate(action, state);
  if (error) return { error };
  const now = new Date().toISOString();

  if (action.type === "send") {
    const { ccy, minor, payCcy } = sendParts(action);
    const paypal = action.rail === "paypal";
    const receiveMinor = convertMinor(ccy, payCcy, minor);
    const next = withHeld(state.balanceKobo, state.pockets, ccy, held(state.balanceKobo, state.pockets, ccy) - minor);
    const txn: Txn = {
      id: uid("txn"),
      kind: "send",
      status: paypal ? "pending" : "completed",
      amountKobo: convertMinor(ccy, "NGN", minor),
      ccy,
      minor,
      counterCcy: payCcy !== ccy ? payCcy : undefined,
      counterMinor: payCcy !== ccy ? receiveMinor : undefined,
      direction: "out",
      title: action.name,
      note: action.note || (paypal ? "PayPal sandbox" : action.contactId ? (payCcy !== ccy ? rateLine(ccy, payCcy) : "Kudi transfer") : "Demo transfer. Not delivered to a live account."),
      contactId: action.contactId,
      createdAt: now,
      paypalOrderId: paypal ? paypalOrderId() : undefined,
      paypalPhase: paypal ? "awaiting" : undefined,
      fxLabel: payCcy !== ccy ? `Gets ${formatCcy(payCcy, receiveMinor)}` : paypal ? formatUsd(minor) : undefined,
    };
    return {
      ...next,
      txns: [txn, ...state.txns],
      sheet: paypal ? { name: "paypal", txnId: txn.id } : { name: "success", txnId: txn.id },
    };
  }

  if (action.type === "convert") {
    const out = convertMinor(action.from, action.to, action.minor);
    const debited = withHeld(
      state.balanceKobo,
      state.pockets,
      action.from,
      held(state.balanceKobo, state.pockets, action.from) - action.minor,
    );
    const credited = withHeld(
      debited.balanceKobo,
      debited.pockets,
      action.to,
      held(debited.balanceKobo, debited.pockets, action.to) + out,
    );
    const txn: Txn = {
      id: uid("txn"),
      kind: "fx",
      status: "completed",
      amountKobo: convertMinor(action.from, "NGN", action.minor),
      ccy: action.from,
      minor: action.minor,
      counterCcy: action.to,
      counterMinor: out,
      direction: "out",
      title: `${RATES[action.from].name} → ${RATES[action.to].name}`,
      note: rateLine(action.from, action.to),
      createdAt: now,
      fxLabel: `Now ${formatCcy(action.to, out)}`,
    };
    return { ...credited, txns: [txn, ...state.txns], sheet: { name: "success", txnId: txn.id } };
  }

  if (action.type === "request") {
    const ccy = action.ccy ?? "NGN";
    const minor = action.minor ?? action.amountKobo;
    const txn: Txn = {
      id: uid("txn"),
      kind: "request",
      status: "pending",
      amountKobo: convertMinor(ccy, "NGN", minor),
      ccy,
      minor,
      direction: "in",
      title: action.name,
      note: action.note || "Money request",
      contactId: action.contactId,
      createdAt: now,
    };
    return {
      balanceKobo: state.balanceKobo,
      pockets: state.pockets,
      txns: [txn, ...state.txns],
      sheet: { name: "success", txnId: txn.id },
    };
  }

  if (action.type === "airtime") {
    const txn: Txn = {
      id: uid("txn"),
      kind: "airtime",
      status: "completed",
      amountKobo: action.amountKobo,
      ccy: "NGN",
      minor: action.amountKobo,
      direction: "out",
      title: `${action.network} airtime`,
      note: action.name,
      phone: action.phone,
      network: action.network,
      createdAt: now,
    };
    return {
      balanceKobo: state.balanceKobo - action.amountKobo,
      pockets: state.pockets,
      txns: [txn, ...state.txns],
      sheet: { name: "success", txnId: txn.id },
    };
  }

  if (action.type === "topup") {
    const txn: Txn = {
      id: uid("txn"),
      kind: "topup",
      status: "pending",
      amountKobo: usdCentsToKobo(action.usdCents),
      ccy: "USD",
      minor: action.usdCents,
      direction: "in",
      title: "PayPal sandbox",
      note: "Waiting for approval",
      paypalOrderId: paypalOrderId(),
      paypalPhase: "awaiting",
      fxLabel: formatUsd(action.usdCents),
      createdAt: now,
    };
    return {
      balanceKobo: state.balanceKobo,
      pockets: state.pockets,
      txns: [txn, ...state.txns],
      sheet: { name: "paypal", txnId: txn.id },
    };
  }

  if (action.type === "payRequest") {
    const txn = state.txns.find((t) => t.id === action.txnId);
    if (!txn || txn.status !== "pending" || txn.direction !== "out") return { error: "That request is already closed." };
    const ccy = txn.ccy ?? "NGN";
    const minor = txn.minor ?? txn.amountKobo;
    const next = withHeld(state.balanceKobo, state.pockets, ccy, held(state.balanceKobo, state.pockets, ccy) - minor);
    return {
      ...next,
      txns: state.txns.map((t) =>
        t.id === txn.id ? { ...t, status: "completed" as const, kind: "send" as const, note: t.note || "Request paid" } : t,
      ),
      sheet: { name: "success", txnId: txn.id },
    };
  }

  const txn = state.txns.find((t) => t.id === action.txnId);
  if (!txn || txn.status !== "pending" || txn.direction !== "in") return { error: "Nothing to collect." };
  const ccy = txn.ccy ?? "NGN";
  const minor = txn.minor ?? txn.amountKobo;
  const next = withHeld(state.balanceKobo, state.pockets, ccy, held(state.balanceKobo, state.pockets, ccy) + minor);
  return {
    ...next,
    txns: state.txns.map((t) => (t.id === txn.id ? { ...t, status: "completed" as const, kind: "receive" as const } : t)),
    sheet: { name: "success", txnId: txn.id },
  };
}

const profileSeed: Profile = {
  name: "Agunwa Ohamadike",
  handle: "@agunwa",
  phone: "0803 555 0142",
  city: "Lagos",
  pin: DEMO_PIN,
  country: "NG",
  phoneStatus: "unverified",
  identityStatus: "not_started",
  notify: true,
  onboarded: false,
};

export const useKudi = create<KudiState>()(
  persist(
    (set, get) => ({
      profile: profileSeed,
      balanceKobo: 18_425_000,
      pockets: SEED_POCKETS,
      balanceHidden: false,
      contacts: CONTACTS,
      txns: seedTxns(),
      messages: [openingMessage(profileSeed.name)],
      tab: "home",
      wallet: null,
      sheet: null,
      pinFor: null,
      formError: null,
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      setTab: (tab) => set({ tab, wallet: null, formError: null }),
      openWallet: (code) => set({ tab: "wallets", wallet: code, formError: null }),
      closeWallet: () => set({ wallet: null }),
      setSheet: (sheet) => set({ sheet, formError: null }),
      toggleHidden: () => set((s) => ({ balanceHidden: !s.balanceHidden })),
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      pushMessage: (message) => set((s) => ({ messages: [...s.messages, message].slice(-40) })),
      clearDrafts: () =>
        set((s) => ({
          messages: s.messages.map((m) => (m.draft ? { ...m, draft: undefined } : m)),
        })),
      begin: (action) => {
        const state = get();
        const error = validate(action, state);
        if (error) {
          set({ formError: error });
          return { ok: false, error };
        }
        if (needsPin(action, state.txns)) {
          set({ pinFor: action, sheet: { name: "pin" }, formError: null });
          return { ok: true };
        }
        const next = apply(state, action);
        if ("error" in next) {
          set({ formError: next.error });
          return { ok: false, error: next.error };
        }
        set({ ...next, pinFor: null, formError: null });
        return { ok: true };
      },
      submitPin: (pin) => {
        const state = get();
        if (!state.pinFor) return { ok: false, error: "Nothing to confirm." };
        if (pin !== state.profile.pin) return { ok: false, error: "That PIN isn’t right." };
        const next = apply(state, state.pinFor);
        if ("error" in next) {
          set({ formError: next.error, pinFor: null, sheet: null });
          return { ok: false, error: next.error };
        }
        set({ ...next, pinFor: null, formError: null });
        return { ok: true };
      },
      cancelPin: () => set({ pinFor: null, sheet: null, formError: null }),
      approvePaypal: (txnId, paypalOrderId, usdCents) =>
        set((s) => {
          const txn = s.txns.find((t) => t.id === txnId);
          if (!txn || txn.status !== "pending") return s;
          return {
            txns: s.txns.map((t) =>
              t.id === txnId
                ? {
                    ...t,
                    minor: usdCents ?? t.minor,
                    paypalOrderId: paypalOrderId || t.paypalOrderId,
                    paypalPhase: "sandbox_ok" as const,
                    note: t.kind === "topup" ? "PayPal confirmed this order. Not in your pocket yet." : t.note,
                    status: t.kind === "topup" ? ("pending" as const) : ("completed" as const),
                  }
                : t,
            ),
          };
        }),
      postDemo: (txnId) =>
        set((s) => {
          const txn = s.txns.find((t) => t.id === txnId);
          if (!txn || txn.kind !== "topup" || txn.paypalPhase === "posted") return s;
          if (txn.paypalPhase !== "sandbox_ok") return s;
          const minor = txn.minor ?? 0;
          return {
            ...withHeld(s.balanceKobo, s.pockets, "USD", held(s.balanceKobo, s.pockets, "USD") + minor),
            txns: s.txns.map((t) =>
              t.id === txnId
                ? { ...t, status: "completed" as const, paypalPhase: "posted" as const, note: "Posted to the demo dollar pocket. Not real funds." }
                : t,
            ),
            sheet: { name: "success", txnId },
          };
        }),
      cancelPaypal: (txnId) =>
        set((s) => {
          const txn = s.txns.find((t) => t.id === txnId);
          if (!txn || txn.status !== "pending") return { sheet: null };
          const txns = s.txns.map((t) => (t.id === txnId ? { ...t, status: "cancelled" as const } : t));
          if (txn.kind !== "send") return { txns, sheet: null, balanceKobo: s.balanceKobo, pockets: s.pockets };
          const ccy = txn.ccy ?? "NGN";
          const minor = txn.minor ?? txn.amountKobo;
          return { ...withHeld(s.balanceKobo, s.pockets, ccy, held(s.balanceKobo, s.pockets, ccy) + minor), txns, sheet: null };
        }),
      declineRequest: (txnId) =>
        set((s) => ({
          txns: s.txns.map((t) => (t.id === txnId ? { ...t, status: "cancelled" as const } : t)),
        })),
    }),
    {
      name: "kudi-wallet-v3",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<KudiState>;
        return {
          ...current,
          ...saved,
          profile: { ...current.profile, ...saved.profile },
          pockets: { ...current.pockets, ...saved.pockets },
        };
      },
      partialize: (s) => ({
        profile: s.profile,
        balanceKobo: s.balanceKobo,
        pockets: s.pockets,
        balanceHidden: s.balanceHidden,
        contacts: s.contacts,
        txns: s.txns,
        messages: s.messages,
      }),
    },
  ),
);

export function latestDraft(messages: ChatMessage[]): MoneyDraft | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const draft = messages[i]?.draft;
    if (draft) return draft;
  }
  return undefined;
}
