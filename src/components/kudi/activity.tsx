import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Smartphone, Wallet } from "lucide-react";
import { dayLabel, formatTxnAmount, timeLabel, type Txn } from "@/lib/kudi/model";
import { useKudi } from "@/lib/kudi/store";
import { cn } from "@/components/kudi/ui";

const FILTERS = ["All", "In", "Out", "Convert", "Pending"] as const;

export function Activity() {
  const txns = useKudi((s) => s.txns);
  const hidden = useKudi((s) => s.balanceHidden);
  const begin = useKudi((s) => s.begin);
  const decline = useKudi((s) => s.declineRequest);
  const setSheet = useKudi((s) => s.setSheet);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [query, setQuery] = useState("");

  const rows = txns.filter((t) => {
    const hay = `${t.title} ${t.note} ${t.paypalOrderId ?? ""}`.toLowerCase();
    if (query && !hay.includes(query.trim().toLowerCase())) return false;
    if (filter === "In") return t.direction === "in" && t.kind !== "request";
    if (filter === "Out") return t.direction === "out" && t.kind !== "fx" && t.status !== "pending";
    if (filter === "Convert") return t.kind === "fx";
    if (filter === "Pending") return t.status === "pending";
    return t.status !== "cancelled";
  });

  const groups: { label: string; items: Txn[] }[] = [];
  for (const txn of rows) {
    const label = dayLabel(txn.createdAt);
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) groups.push({ label, items: [txn] });
    else last.items.push(txn);
  }

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="font-display text-3xl">Activity</h1>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, note, or order"
        aria-label="Search transactions"
        className="mt-4 h-12 w-full rounded-2xl border border-line bg-card px-3 text-sm outline-none"
      />
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            className={cn(
              "press h-10 rounded-full px-3 text-sm font-semibold",
              filter === item ? "bg-ink text-paper" : "bg-card text-ink",
            )}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {groups.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted">Nothing in this list yet.</p>
      ) : (
        groups.map((group) => (
          <section key={group.label} className="mt-5">
            <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">{group.label}</h2>
            <ul className="mt-2 overflow-hidden rounded-3xl bg-card">
              {group.items.map((txn) => (
                <li key={txn.id} className="border-b border-line px-3 py-3 last:border-b-0">
                  <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => setSheet({ name: "detail", txnId: txn.id })}>
                    <TxnIcon txn={txn} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{labelFor(txn)}</p>
                      <p className="truncate text-sm text-muted">
                        {txn.note} · {timeLabel(txn.createdAt)}
                        {txn.status === "pending" ? " · waiting" : ""}
                        {txn.status === "cancelled" ? " · cancelled" : ""}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        txn.direction === "in" && txn.status === "completed" ? "text-leaf-deep" : "text-ink",
                      )}
                    >
                      {txn.direction === "in" ? "+" : "−"}
                      {hidden ? "••••" : formatTxnAmount(txn)}
                    </p>
                  </button>
                  {txn.fxLabel ? (
                    <p className="mt-1 pl-12 text-xs text-muted">
                      {txn.paypalOrderId && txn.kind !== "fx" ? `PayPal ${txn.fxLabel}` : txn.fxLabel}
                    </p>
                  ) : null}
                  {txn.status === "pending" && txn.paypalOrderId ? (
                    <div className="mt-2 flex gap-2 pl-12">
                      <button
                        type="button"
                        className="press h-10 rounded-full bg-leaf px-4 text-sm font-semibold text-paper"
                        onClick={() => setSheet({ name: "paypal", txnId: txn.id })}
                      >
                        Approve
                      </button>
                    </div>
                  ) : null}
                  {txn.kind === "request" && txn.status === "pending" && txn.direction === "out" ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="press h-10 rounded-full bg-leaf px-4 text-sm font-semibold text-paper"
                        onClick={() => begin({ type: "payRequest", txnId: txn.id })}
                      >
                        Pay
                      </button>
                      <button
                        type="button"
                        className="press h-10 rounded-full bg-paper px-4 text-sm font-semibold"
                        onClick={() => decline(txn.id)}
                      >
                        Decline
                      </button>
                    </div>
                  ) : null}
                  {txn.kind === "request" && txn.status === "pending" && txn.direction === "in" ? (
                    <button
                      type="button"
                      className="press mt-2 h-10 rounded-full bg-ink px-4 text-sm font-semibold text-paper"
                      onClick={() => begin({ type: "collectRequest", txnId: txn.id })}
                    >
                      They paid
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function labelFor(txn: Txn): string {
  if (txn.kind === "request" && txn.status === "pending" && txn.direction === "in") return `Waiting on ${txn.title}`;
  if (txn.kind === "request" && txn.status === "pending" && txn.direction === "out") return `${txn.title} asked you`;
  if (txn.kind === "topup") return "Bought dollars";
  if (txn.kind === "fx") return txn.title;
  if (txn.kind === "airtime") return txn.title;
  if (txn.kind === "receive") return `From ${txn.title}`;
  return `To ${txn.title}`;
}

function TxnIcon({ txn }: { txn: Txn }) {
  const Icon = txn.kind === "airtime" ? Smartphone : txn.kind === "topup" ? Wallet : txn.direction === "in" ? ArrowDownLeft : ArrowUpRight;
  const tone = txn.direction === "in" ? "bg-mint text-leaf-deep" : "bg-coral-soft text-coral";
  return (
    <span className={cn("flex size-10 items-center justify-center rounded-full", tone)}>
      <Icon className="size-4" />
    </span>
  );
}
