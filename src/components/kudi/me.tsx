import { useState } from "react";
import { Copy, ShieldCheck } from "lucide-react";
import { AI_PROMPT, DEMO_PIN, formatCcy, formatTxnAmount, type Ccy, type Market } from "@/lib/kudi/model";
import { useKudi } from "@/lib/kudi/store";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { cn } from "@/components/kudi/ui";
import { CurrencyMark } from "@/components/kudi/flags";

const CURRENCIES: { code: Ccy; name: string }[] = [
  { code: "USD", name: "US Dollar" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "GHS", name: "Ghanaian Cedi" },
];

export function Me() {
  const profile = useKudi((s) => s.profile);
  const setProfile = useKudi((s) => s.setProfile);
  const balance = useKudi((s) => s.balanceKobo);
  const pockets = useKudi((s) => s.pockets);
  const hidden = useKudi((s) => s.balanceHidden);
  const txns = useKudi((s) => s.txns);
  const user = useCurrentUser();
  const [copied, setCopied] = useState(false);
  const [pin, setPin] = useState(profile.pin);
  const [name, setName] = useState(profile.name);
  const [pinSaved, setPinSaved] = useState(false);
  const orders = txns.filter((t) => t.paypalOrderId);
  const held = (code: Ccy) => (code === "NGN" ? balance : pockets[code]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="px-4 pt-5 pb-8">
      <h1 className="font-display text-3xl">Profile</h1>
      <p className="mt-1 text-sm text-muted">{user?.primaryEmail ?? "No email on this session"} · unverified inbox</p>

      <section className="surface mt-4 rounded-3xl p-4">
        <h2 className="font-semibold">Personal information</h2>
        <label className="mt-3 block text-sm text-muted">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              const next = name.trim();
              if (next) setProfile({ name: next, handle: `@${next.split(" ")[0]?.toLowerCase() ?? "me"}` });
            }}
            className="mt-1 h-12 w-full rounded-2xl bg-paper px-3 text-base font-semibold text-ink outline-none"
          />
        </label>
        <p className="mt-3 text-sm text-muted">Handle</p>
        <p className="font-semibold">{profile.handle}</p>
        <label className="mt-3 block text-sm text-muted">
          Country
          <select
            value={profile.country}
            className="mt-1 h-12 w-full rounded-2xl bg-paper px-3 font-semibold text-ink outline-none"
            onChange={(e) =>
              setProfile({
                country: e.target.value as Market,
                city: e.target.value === "NG" ? "Lagos" : e.target.value === "KE" ? "Nairobi" : e.target.value === "GH" ? "Accra" : "New York",
              })
            }
          >
            <option value="NG">Nigeria</option>
            <option value="KE">Kenya</option>
            <option value="GH">Ghana</option>
            <option value="US">United States</option>
          </select>
        </label>
        <p className="mt-3 text-sm text-muted">Phone · {profile.phoneStatus}</p>
        <p className="font-semibold">{profile.phone}</p>
        <p className="mt-1 text-xs text-muted">{profile.city}. No SMS check in this demo.</p>
      </section>

      <section className="surface mt-4 rounded-3xl p-4">
        <h2 className="font-semibold">Account verification</h2>
        <p className="mt-2 text-sm text-muted">Email</p>
        <p className="text-sm font-semibold">Session only. Not confirmed by inbox.</p>
        <p className="mt-3 text-sm text-muted">Identity</p>
        <p className="text-sm font-semibold">{profile.identityStatus === "submitted" ? "Submitted for review" : "Not started"}</p>
        {profile.identityStatus === "not_started" ? (
          <button type="button" className="press mt-2 h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on" onClick={() => setProfile({ identityStatus: "submitted" })}>
            Submit details
          </button>
        ) : (
          <p className="mt-1 text-xs text-muted">Not a government ID check. This demo does not mark anyone verified.</p>
        )}
      </section>

      <section className="surface mt-4 rounded-3xl p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-leaf-deep" />
          <h2 className="font-semibold">Security</h2>
        </div>
        <p className="mt-1 text-sm text-muted">PIN confirms anything from about ₦20,000. Demo starts at {DEMO_PIN}.</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d{4}$/.test(pin)) {
              setProfile({ pin });
              setPinSaved(true);
            }
          }}
        >
          <input
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
              setPinSaved(false);
            }}
            inputMode="numeric"
            aria-label="New PIN"
            className="h-12 w-28 rounded-2xl bg-paper px-3 text-center text-lg font-semibold tabular-nums outline-none"
          />
          <button type="submit" className="press h-12 rounded-full bg-ink px-4 text-sm font-semibold text-on">
            {pinSaved ? "Saved" : "Save PIN"}
          </button>
        </form>
      </section>

      <section className="surface mt-4 rounded-3xl p-4">
        <h2 className="font-semibold">Notifications</h2>
        <label className="mt-3 flex items-center justify-between text-sm font-semibold">
          Email alerts for this demo
          <input type="checkbox" checked={profile.notify} onChange={(e) => setProfile({ notify: e.target.checked })} />
        </label>
        <p className="mt-2 text-xs text-muted">Preference only. No mail is sent.</p>
      </section>

      <section className="surface mt-4 overflow-hidden rounded-3xl">
        <h2 className="px-4 pt-4 font-semibold">Supported currencies</h2>
        <ul>
          {CURRENCIES.map((item) => (
            <li key={item.code} className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0">
              <CurrencyMark code={item.code} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{item.code}</span>
                <span className="block text-sm text-muted">{item.name}</span>
              </span>
              <span className="font-semibold tabular-nums">{hidden ? "••••" : formatCcy(item.code, held(item.code))}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface mt-4 rounded-3xl p-4 text-sm">
        <h2 className="font-semibold">Help</h2>
        <ul className="mt-2 space-y-2 text-muted">
          <li>Add dollars with PayPal sandbox, then post them to the demo pocket. Those two steps stay separate.</li>
          <li>Exchange moves naira, cedis, shillings, and dollars inside this ledger. The rate is a demo quote and the fee is zero.</li>
          <li>Send to Adaeze, Chidi, Mama, Amina, Kwame, or Zuri. Airtime is MTN, Airtel, Glo, or 9mobile, paid in naira.</li>
          <li>Talk to pay, or paste a kudi block from Claude or ChatGPT, then confirm.</li>
        </ul>
      </section>

      <section className="mt-4 rounded-3xl bg-ink p-4 text-on">
        <h2 className="font-display text-2xl">Use it in Claude or ChatGPT</h2>
        <p className="mt-2 text-sm text-paper">Paste the instructions, ask in plain language, then drop the kudi block into Talk to pay.</p>
        <button
          type="button"
          className="press mt-4 flex h-11 items-center gap-2 rounded-full bg-leaf px-4 text-sm font-semibold text-on"
          onClick={() => void copyPrompt()}
        >
          <Copy className="size-4" />
          {copied ? "Copied" : "Copy instructions"}
        </button>
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-semibold text-muted">PayPal sandbox orders</h2>
        <ul className="surface mt-2 overflow-hidden rounded-3xl">
          {orders.length === 0 ? (
            <li className="px-4 py-4 text-sm text-muted">None yet. Buy dollars or send to a PayPal email.</li>
          ) : (
            orders.map((txn) => (
              <li key={txn.id} className="border-b border-line px-4 py-3 last:border-b-0">
                <p className="text-sm font-semibold">{txn.paypalOrderId}</p>
                <p className={cn("text-sm text-muted")}>
                  {txn.title} · {formatTxnAmount(txn)}
                  {txn.fxLabel ? ` · ${txn.fxLabel}` : ""} · {txn.paypalPhase ?? txn.status}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>

      <div className="mt-4">
        <UserButton />
      </div>

      <p className="mt-6 text-xs text-muted">
        Practice wallet for the PayPal AI Hackathon. Balances stay on this device until a live PayPal client is connected. Not a bank.
      </p>
    </div>
  );
}
