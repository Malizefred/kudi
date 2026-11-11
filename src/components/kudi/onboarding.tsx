import { useState } from "react";
import { saveKudiProfile } from "@/lib/kudi/ledger-fn";
import type { Market } from "@/lib/kudi/model";
import { useKudi } from "@/lib/kudi/store";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { Flag, type MarketCode } from "@/components/kudi/flags";

const MARKETS: { id: Market; name: string; city: string }[] = [
  { id: "NG", name: "Nigeria", city: "Lagos" },
  { id: "KE", name: "Kenya", city: "Nairobi" },
  { id: "GH", name: "Ghana", city: "Accra" },
  { id: "US", name: "United States", city: "New York" },
];

export function Onboarding() {
  const profile = useKudi((s) => s.profile);
  const setProfile = useKudi((s) => s.setProfile);
  const user = useCurrentUser();
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState<Market>(profile.country);
  const [phone, setPhone] = useState(profile.phone);
  const [error, setError] = useState<string | null>(null);

  async function finish(identity: "not_started" | "submitted") {
    const market = MARKETS.find((item) => item.id === country) ?? MARKETS[0];
    setProfile({
      country,
      city: market.city,
      phone: phone.trim() || profile.phone,
      identityStatus: identity,
      onboarded: true,
    });
    try {
      await saveKudiProfile({
        data: {
          displayName: profile.name,
          handle: profile.handle,
          country,
          phone: phone.trim() || profile.phone,
          identityStatus: identity,
        },
      });
    } catch {
      setError("Saved on this device. The account copy will sync when you are signed in.");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper px-5 pt-10 pb-8 text-ink">
      <p className="text-sm font-semibold text-leaf-deep">Kudi</p>
      {step === 0 ? (
        <>
          <h1 className="mt-3 font-display text-4xl">Hold dollars. Pay across Africa.</h1>
          <p className="mt-3 text-base text-muted">
            Buy USD with naira, cedis, or shillings. Send to Adaeze, Kwame, or a PayPal email. Talk to pay the same way you would in Claude or ChatGPT.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <li className="surface rounded-2xl px-4 py-3">Demo ledger on your account. Not a bank.</li>
            <li className="surface rounded-2xl px-4 py-3">PayPal sandbox never becomes spendable money on its own.</li>
            <li className="surface rounded-2xl px-4 py-3">Nigeria, Kenya, Ghana, and USD. Airtime stays on naira.</li>
          </ul>
        </>
      ) : null}
      {step === 1 ? (
        <>
          <h1 className="mt-3 font-display text-4xl">Your email</h1>
          <p className="mt-2 text-sm text-muted">
            This is the address on your session. Kudi does not send a confirmation code in this demo, so the email stays unverified.
          </p>
          <div className="surface mt-4 rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted">Signed in as</p>
            <p className="mt-1 font-semibold">{user?.primaryEmail ?? "No email on this session"}</p>
          </div>
        </>
      ) : null}
      {step === 2 ? (
        <>
          <h1 className="mt-3 font-display text-4xl">Where do you live?</h1>
          <div className="mt-4 space-y-2">
            {MARKETS.map((market) => (
              <button
                key={market.id}
                type="button"
                className={`press flex h-14 w-full items-center gap-3 rounded-2xl border px-4 text-left font-semibold ${country === market.id ? "border-leaf bg-mint" : "border-line bg-card"}`}
                onClick={() => setCountry(market.id)}
              >
                <span className="overflow-hidden rounded-sm ring-1 ring-line">
                  <Flag market={market.id as MarketCode} />
                </span>
                <span className="flex-1">{market.name}</span>
                <span className="text-sm text-muted">{market.id}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
      {step === 3 ? (
        <>
          <h1 className="mt-3 font-display text-4xl">Phone number</h1>
          <p className="mt-2 text-sm text-muted">There is no SMS check in this demo. The number is saved as unverified.</p>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.slice(0, 20))}
            inputMode="tel"
            aria-label="Phone number"
            className="mt-4 h-14 w-full rounded-2xl border border-line bg-card px-4 text-lg outline-none"
          />
        </>
      ) : null}
      {step === 4 ? (
        <>
          <h1 className="mt-3 font-display text-4xl">Identity</h1>
          <p className="mt-2 text-sm text-muted">
            This is not a government ID check and it will not mark you verified. Submitting only stores that you asked for a review.
          </p>
          <div className="surface mt-4 rounded-2xl p-4 text-sm">
            <p className="font-semibold">{profile.name}</p>
            <p className="text-muted">{profile.handle}</p>
            <p className="mt-2 text-muted">Status: not started</p>
          </div>
        </>
      ) : null}
      {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
      <div className="mt-auto flex gap-2 pt-8">
        {step > 0 ? (
          <button type="button" className="press h-12 flex-1 rounded-full border border-line bg-card font-semibold" onClick={() => setStep((n) => n - 1)}>
            Back
          </button>
        ) : null}
        {step < 4 ? (
          <button type="button" className="press h-12 flex-[2] rounded-full bg-leaf font-semibold text-on" onClick={() => setStep((n) => n + 1)}>
            Continue
          </button>
        ) : (
          <>
            <button type="button" className="press h-12 flex-1 rounded-full border border-line bg-card font-semibold" onClick={() => void finish("not_started")}>
              Skip
            </button>
            <button type="button" className="press h-12 flex-[2] rounded-full bg-leaf font-semibold text-on" onClick={() => void finish("submitted")}>
              Submit for review
            </button>
          </>
        )}
      </div>
    </main>
  );
}
