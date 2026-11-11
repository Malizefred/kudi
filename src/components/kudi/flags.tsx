import type { Ccy } from "@/lib/kudi/model";
import { cn } from "@/components/kudi/ui";

export type MarketCode = "NG" | "KE" | "GH" | "US";

export function marketFor(code: Ccy): MarketCode {
  if (code === "NGN") return "NG";
  if (code === "KES") return "KE";
  if (code === "GHS") return "GH";
  return "US";
}

export function Flag({ market, className }: { market: MarketCode; className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={cn("h-4 w-6 shrink-0", className)} aria-hidden>
      {market === "NG" ? (
        <>
          <rect width="8" height="16" fill="#008751" />
          <rect x="8" width="8" height="16" fill="#ffffff" />
          <rect x="16" width="8" height="16" fill="#008751" />
        </>
      ) : null}
      {market === "GH" ? (
        <>
          <rect width="24" height="5.34" fill="#ce1126" />
          <rect y="5.34" width="24" height="5.32" fill="#fcd116" />
          <rect y="10.66" width="24" height="5.34" fill="#006b3f" />
          <polygon points="12,6.3 12.7,8.2 14.7,8.2 13.1,9.4 13.7,11.3 12,10.1 10.3,11.3 10.9,9.4 9.3,8.2 11.3,8.2" fill="#000000" />
        </>
      ) : null}
      {market === "KE" ? (
        <>
          <rect width="24" height="4.6" fill="#000000" />
          <rect y="4.6" width="24" height="0.7" fill="#ffffff" />
          <rect y="5.3" width="24" height="5.4" fill="#bb0000" />
          <rect y="10.7" width="24" height="0.7" fill="#ffffff" />
          <rect y="11.4" width="24" height="4.6" fill="#006600" />
        </>
      ) : null}
      {market === "US" ? (
        <>
          <rect width="24" height="16" fill="#bf0a30" />
          <rect y="2.28" width="24" height="2.28" fill="#ffffff" />
          <rect y="6.86" width="24" height="2.28" fill="#ffffff" />
          <rect y="11.42" width="24" height="2.28" fill="#ffffff" />
          <rect width="10" height="8.6" fill="#002868" />
        </>
      ) : null}
    </svg>
  );
}

export function CurrencyMark({ code }: { code: Ccy }) {
  return (
    <span className="flex size-11 items-center justify-center overflow-hidden rounded-full border border-line bg-card">
      <Flag market={marketFor(code)} className="h-5 w-8" />
    </span>
  );
}

export function CcyChips({
  value,
  onChange,
  omit,
}: {
  value: Ccy;
  onChange: (code: Ccy) => void;
  omit?: Ccy;
}) {
  const codes: Ccy[] = ["USD", "NGN", "KES", "GHS"];
  return (
    <div className="grid grid-cols-4 gap-2">
      {codes.map((code) => {
        const off = omit === code;
        const on = value === code;
        return (
          <button
            key={code}
            type="button"
            disabled={off}
            className={cn(
              "press flex h-11 items-center justify-center gap-1 rounded-full text-xs font-semibold disabled:opacity-30",
              on ? "bg-ink text-on" : "bg-paper text-ink",
            )}
            onClick={() => onChange(code)}
          >
            <span className="overflow-hidden rounded-sm ring-1 ring-line">
              <Flag market={marketFor(code)} />
            </span>
            {code}
          </button>
        );
      })}
    </div>
  );
}
