import { ArrowLeftRight, Plus, Send, Smartphone, Wallet } from "lucide-react";
import { formatCcy, formatTxnAmount, type Ccy } from "@/lib/kudi/model";
import { useKudi } from "@/lib/kudi/store";
import { CurrencyMark } from "@/components/kudi/flags";

const ROWS: { code: Ccy; name: string }[] = [
  { code: "USD", name: "US Dollar" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "GHS", name: "Ghanaian Cedi" },
];

export function Wallets() {
  const pockets = useKudi((s) => s.pockets);
  const naira = useKudi((s) => s.balanceKobo);
  const hidden = useKudi((s) => s.balanceHidden);
  const txns = useKudi((s) => s.txns);
  const setSheet = useKudi((s) => s.setSheet);
  const setTab = useKudi((s) => s.setTab);
  const open = useKudi((s) => s.wallet);
  const closeWallet = useKudi((s) => s.closeWallet);
  const amount = (code: Ccy) => (code === "NGN" ? naira : pockets[code]);
  const activity = txns.filter((t) => t.status !== "cancelled" && (t.ccy === open || (!t.ccy && open === "NGN"))).slice(0, 6);

  if (open) {
    const meta = ROWS.find((row) => row.code === open)!;
    return (
      <div className="px-4 pt-5 pb-8">
        <button type="button" className="text-sm font-semibold text-leaf-deep" onClick={closeWallet}>
          All wallets
        </button>
        <div className="mt-3 flex items-center gap-3">
          <CurrencyMark code={open} />
          <p className="text-sm text-muted">{meta.name}</p>
        </div>
        <h1 className="mt-3 font-display text-5xl tabular-nums">{hidden ? "••••" : formatCcy(open, amount(open))}</h1>
        <p className="mt-1 text-sm text-muted">Available in the demo ledger</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {open === "USD" ? (
            <button type="button" className="press h-12 rounded-full bg-leaf text-sm font-semibold text-on" onClick={() => setSheet({ name: "topup" })}>
              <Plus className="mr-1 inline size-4" /> Add
            </button>
          ) : open === "NGN" ? (
            <button type="button" className="press h-12 rounded-full bg-leaf text-sm font-semibold text-on" onClick={() => setSheet({ name: "airtime" })}>
              <Smartphone className="mr-1 inline size-4" /> Airtime
            </button>
          ) : (
            <button type="button" className="press h-12 rounded-full bg-leaf text-sm font-semibold text-on" onClick={() => setTab("exchange")}>
              <ArrowLeftRight className="mr-1 inline size-4" /> Exchange
            </button>
          )}
          <button type="button" className="press h-12 rounded-full border border-line bg-card text-sm font-semibold" onClick={() => setSheet({ name: "send", ccy: open })}>
            <Send className="mr-1 inline size-4" /> Send
          </button>
          <button type="button" className="press h-12 rounded-full border border-line bg-card text-sm font-semibold" onClick={() => setSheet({ name: "receive" })}>
            <Wallet className="mr-1 inline size-4" /> Receive
          </button>
          <button type="button" className="press h-12 rounded-full border border-line bg-card text-sm font-semibold" onClick={() => setTab("exchange")}>
            Exchange
          </button>
        </div>
        <h2 className="mt-6 font-semibold">Activity</h2>
        <ul className="surface mt-2 overflow-hidden rounded-3xl">
          {activity.length === 0 ? (
            <li className="px-4 py-4 text-sm text-muted">Nothing in this wallet yet.</li>
          ) : (
            activity.map((txn) => (
              <li key={txn.id} className="border-b border-line last:border-b-0">
                <button type="button" className="press flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setSheet({ name: "detail", txnId: txn.id })}>
                  <span>
                    <span className="block font-semibold">{txn.title}</span>
                    <span className="text-sm text-muted">{txn.status}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{hidden ? "••••" : formatTxnAmount(txn)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-8">
      <h1 className="font-display text-3xl">Wallets</h1>
      <p className="mt-1 text-sm text-muted">Dollars, naira, shillings, and cedis. One demo ledger.</p>
      <ul className="mt-4 space-y-2">
        {ROWS.map((row) => (
          <li key={row.code}>
            <button type="button" className="press surface flex w-full items-center gap-3 rounded-3xl px-4 py-4 text-left" onClick={() => useKudi.getState().openWallet(row.code)}>
              <CurrencyMark code={row.code} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{row.code}</span>
                <span className="block text-sm text-muted">{row.name}</span>
              </span>
              <span className="font-display text-xl tabular-nums">{hidden ? "••••" : formatCcy(row.code, amount(row.code))}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
