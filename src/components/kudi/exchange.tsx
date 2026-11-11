import { useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { convertMinor, formatCcy, minMinor, rateLine, RATES, type Ccy } from "@/lib/kudi/model";
import { useKudi } from "@/lib/kudi/store";
import { CcyChips } from "@/components/kudi/flags";

export function Exchange() {
  const begin = useKudi((s) => s.begin);
  const formError = useKudi((s) => s.formError);
  const balanceKobo = useKudi((s) => s.balanceKobo);
  const pockets = useKudi((s) => s.pockets);
  const [source, setSource] = useState<Ccy>("NGN");
  const [dest, setDest] = useState<Ccy>("USD");
  const [raw, setRaw] = useState("150000");
  const major = Number(raw || "0");
  const minor = Number.isFinite(major) ? Math.round(major * 100) : 0;
  const fee = 0;
  const out = convertMinor(source, dest, minor);
  const available = source === "NGN" ? balanceKobo : pockets[source];

  function pickSource(code: Ccy) {
    setSource(code);
    if (code === dest) setDest(code === "USD" ? "NGN" : "USD");
  }

  function swap() {
    setSource(dest);
    setDest(source);
  }

  return (
    <div className="px-4 pt-5 pb-8">
      <h1 className="font-display text-3xl">Exchange</h1>
      <p className="mt-1 text-sm text-muted">Buy dollars with naira, cedis, or shillings. Move the other way when you need to pay someone. Demo rate, no fee.</p>

      <section className="surface mt-4 rounded-3xl p-4">
        <p className="text-xs font-semibold text-muted">You pay</p>
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value.replace(/[^\d.]/g, "").slice(0, 10))}
          inputMode="decimal"
          aria-label="Amount you pay"
          className="mt-2 h-14 w-full bg-transparent font-display text-4xl tabular-nums outline-none"
        />
        <CcyChips value={source} onChange={pickSource} />
        <p className="mt-2 text-sm text-muted">
          {RATES[source].name} · you have {formatCcy(source, available)}
        </p>
      </section>

      <div className="relative z-10 -my-3 flex justify-center">
        <button
          type="button"
          className="press flex size-11 items-center justify-center rounded-full border border-line bg-card"
          aria-label="Swap currencies"
          onClick={swap}
        >
          <ArrowDownUp className="size-5" />
        </button>
      </div>

      <section className="surface rounded-3xl p-4">
        <p className="text-xs font-semibold text-muted">You receive</p>
        <p className="mt-2 font-display text-4xl tabular-nums">{formatCcy(dest, out)}</p>
        <CcyChips value={dest} omit={source} onChange={setDest} />
        <p className="mt-2 text-sm text-muted">{RATES[dest].name}</p>
      </section>

      <dl className="surface mt-3 space-y-2 rounded-3xl p-4 text-sm">
        <Line k="Rate" v={rateLine(source, dest)} />
        <Line k="Conversion" v={formatCcy(dest, out)} />
        <Line k="Fee" v={formatCcy(source, fee)} />
        <Line k="Total payable" v={formatCcy(source, minor + fee)} />
      </dl>
      {formError ? <p className="mt-3 text-sm text-coral">{formError}</p> : null}
      <button
        type="button"
        className="press mt-4 h-12 w-full rounded-full bg-leaf text-base font-semibold text-on disabled:opacity-40"
        disabled={source === dest || minor < minMinor(source)}
        onClick={() => begin({ type: "convert", from: source, to: dest, minor })}
      >
        Confirm exchange
      </button>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="font-semibold tabular-nums">{v}</dd>
    </div>
  );
}
