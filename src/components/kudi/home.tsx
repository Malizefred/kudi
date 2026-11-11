import { ArrowLeftRight, Bell, Eye, EyeOff, MessageCircle, Plus, Send, Wallet } from "lucide-react";
import { formatCcy, formatTxnAmount, type Ccy, type Txn } from "@/lib/kudi/model";
import { useKudi } from "@/lib/kudi/store";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { CurrencyMark } from "@/components/kudi/flags";

const POCKETS: { code: Ccy; name: string }[] = [
  { code: "USD", name: "US Dollar" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "GHS", name: "Ghanaian Cedi" },
];

export function Home() {
  const profile = useKudi((s) => s.profile);
  const pockets = useKudi((s) => s.pockets);
  const balance = useKudi((s) => s.balanceKobo);
  const hidden = useKudi((s) => s.balanceHidden);
  const toggle = useKudi((s) => s.toggleHidden);
  const txns = useKudi((s) => s.txns);
  const setSheet = useKudi((s) => s.setSheet);
  const setTab = useKudi((s) => s.setTab);
  const openWallet = useKudi((s) => s.openWallet);
  const user = useCurrentUser();
  const first = (user?.displayName || profile.name).split(" ")[0] || "there";
  const recent = txns.filter((t) => t.status !== "cancelled").slice(0, 3);
  const waiting = txns.some((t) => t.status === "pending");

  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
      <header className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">Good to see you</p>
          <h1 className="truncate font-display text-2xl">{first}</h1>
        </div>
        <button
          type="button"
          className="press relative flex size-11 items-center justify-center rounded-full border border-line bg-card"
          aria-label="Activity"
          onClick={() => setTab("activity")}
        >
          <Bell className="size-5" />
          {waiting ? <span className="absolute top-2 right-2 size-2 rounded-full bg-leaf" /> : null}
        </button>
      </header>

      <section className="surface rise rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <button type="button" className="press flex items-center gap-2 text-sm font-semibold text-muted" onClick={toggle}>
            US dollar wallet
            {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
          <span className="rounded-full bg-mint px-2 py-1 text-xs font-semibold text-leaf-deep">Demo ledger</span>
        </div>
        <button type="button" className="mt-2 block text-left" onClick={() => openWallet("USD")}>
          <span className="font-display text-5xl tabular-nums">{hidden ? "$••••" : formatCcy("USD", pockets.USD)}</span>
        </button>
        <p className="mt-1 text-sm text-muted">PayPal approval does not fund this number. Add to the pocket only after the server posts it.</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          <Action icon={Plus} label="Add" onClick={() => setSheet({ name: "topup" })} />
          <Action icon={Send} label="Send" onClick={() => setSheet({ name: "send", ccy: "USD" })} />
          <Action icon={Wallet} label="Receive" onClick={() => setSheet({ name: "receive" })} />
          <Action icon={ArrowLeftRight} label="Exchange" onClick={() => setTab("exchange")} />
        </div>
      </section>

      <section className="surface rise rise-2 overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="font-semibold">Wallets</h2>
          <button type="button" className="text-sm font-semibold text-leaf-deep" onClick={() => setTab("wallets")}>
            View all
          </button>
        </div>
        <ul>
          {POCKETS.map((item) => (
            <PocketRow
              key={item.code}
              code={item.code}
              name={item.name}
              amount={hidden ? "••••" : item.code === "NGN" ? formatCcy("NGN", balance) : formatCcy(item.code, pockets[item.code])}
              onOpen={() => openWallet(item.code)}
            />
          ))}
        </ul>
      </section>

      <section className="rise rise-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Recent</h2>
          <button type="button" className="text-sm font-semibold text-leaf-deep" onClick={() => setTab("activity")}>
            View all
          </button>
        </div>
        <ul className="surface overflow-hidden rounded-3xl">
          {recent.length === 0 ? (
            <li className="px-4 py-4 text-sm text-muted">No transactions yet.</li>
          ) : (
            recent.map((txn) => <RecentRow key={txn.id} txn={txn} hidden={hidden} />)
          )}
        </ul>
      </section>

      <button type="button" className="press surface rise rise-4 rounded-3xl p-4 text-left" onClick={() => setTab("chat")}>
        <span className="flex items-center gap-2 font-semibold">
          <MessageCircle className="size-5 text-leaf" />
          Talk to pay
        </span>
        <p className="mt-1 text-sm text-muted">“Send $10 to Adaeze”, “Convert 150,000 naira to dollars”, or “Buy 500 MTN airtime.” Paste the same line from Claude or ChatGPT.</p>
      </button>
    </div>
  );
}

function PocketRow({
  code,
  name,
  amount,
  onOpen,
}: {
  code: Ccy;
  name: string;
  amount: string;
  onOpen: () => void;
}) {
  return (
    <li className="border-t border-line">
      <button type="button" className="press flex w-full items-center gap-3 px-4 py-3 text-left" onClick={onOpen}>
        <CurrencyMark code={code} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{code}</span>
          <span className="block text-sm text-muted">{name}</span>
        </span>
        <span className="font-semibold tabular-nums">{amount}</span>
      </button>
    </li>
  );
}

function RecentRow({ txn, hidden }: { txn: Txn; hidden: boolean }) {
  const setSheet = useKudi((s) => s.setSheet);
  return (
    <li className="border-t border-line first:border-t-0">
      <button type="button" className="press flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => setSheet({ name: "detail", txnId: txn.id })}>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{txn.title}</span>
          <span className="block text-sm text-muted">{txn.status === "pending" ? "Pending" : txn.status === "completed" ? "Completed" : "Cancelled"}</span>
        </span>
        <span className="font-semibold tabular-nums">{hidden ? "••••" : formatTxnAmount(txn)}</span>
      </button>
    </li>
  );
}

function Action({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick: () => void }) {
  return (
    <button type="button" className="press flex flex-col items-center gap-2" onClick={onClick}>
      <span className="flex size-12 items-center justify-center rounded-2xl bg-leaf text-on">
        <Icon className="size-5" />
      </span>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
