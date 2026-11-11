import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronLeft, Copy, Delete } from "lucide-react";
import { openSandboxPayment, postDemoLedger, recordPaypalCapture } from "@/lib/kudi/ledger-fn";
import {
  CCY_LIST,
  convertMinor,
  formatCcy,
  formatNgn,
  formatTxnAmount,
  formatUsd,
  MIN_SEND_KOBO,
  minMinor,
  rateLine,
  RATES,
  type Ccy,
  type Contact,
} from "@/lib/kudi/model";
import { useKudi } from "@/lib/kudi/store";
import { Avatar, cn } from "@/components/kudi/ui";
import { CcyChips } from "@/components/kudi/flags";
import { PaypalCheckout } from "@/components/kudi/paypal-buttons";

const NETWORKS = ["MTN", "Airtel", "Glo", "9mobile"];
const DOLLAR_BUYS = [10, 25, 50, 100];

export function Sheets() {
  const sheet = useKudi((s) => s.sheet);
  if (!sheet) return null;
  if (sheet.name === "send") return <SendSheet contactId={sheet.contactId} preset={sheet.ccy} />;
  if (sheet.name === "request") return <RequestSheet contactId={sheet.contactId} />;
  if (sheet.name === "airtime") return <AirtimeSheet />;
  if (sheet.name === "topup") return <TopupSheet />;
  if (sheet.name === "convert") return <ConvertSheet from={sheet.from} to={sheet.to} />;
  if (sheet.name === "pin") return <PinSheet />;
  if (sheet.name === "paypal") return <PaypalSheet txnId={sheet.txnId} />;
  if (sheet.name === "receive") return <ReceiveSheet />;
  if (sheet.name === "detail") return <DetailSheet txnId={sheet.txnId} />;
  return <SuccessSheet txnId={sheet.txnId} />;
}

function Frame({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: React.ReactNode;
}) {
  const setSheet = useKudi((s) => s.setSheet);
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-paper">
      <header className="flex items-center gap-2 px-3 py-3">
        <button
          type="button"
          className="press flex size-11 items-center justify-center rounded-full bg-card"
          aria-label="Back"
          onClick={() => setSheet(null)}
        >
          <ChevronLeft className="size-5" />
        </button>
        <h2 className="font-display text-2xl">{title}</h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      {footer ? <div className="border-t border-line px-4 py-3">{footer}</div> : null}
    </div>
  );
}

function Keypad({ onKey }: { onKey: (key: string) => void }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "del"];
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          className="press flex h-12 items-center justify-center rounded-2xl bg-card text-lg font-semibold"
          onClick={() => onKey(key)}
        >
          {key === "del" ? <Delete className="size-5" /> : key}
        </button>
      ))}
    </div>
  );
}

function pushDigit(raw: string, key: string): string {
  if (key === "del") return raw.slice(0, -1);
  if (raw.length >= 7) return raw;
  return `${raw}${key}`.replace(/^0+(?=\d)/, "");
}

function People({
  selected,
  onPick,
}: {
  selected?: string;
  onPick: (contact: Contact) => void;
}) {
  const contacts = useKudi((s) => s.contacts);
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {contacts.map((contact) => (
        <button
          key={contact.id}
          type="button"
          className={cn("press flex w-16 shrink-0 flex-col items-center gap-1", selected === contact.id ? "" : "opacity-70")}
          onClick={() => onPick(contact)}
        >
          <span className={cn("rounded-full", selected === contact.id ? "ring-2 ring-leaf ring-offset-2 ring-offset-paper" : "")}>
            <Avatar name={contact.name} tone={contact.tone} size="sm" />
          </span>
          <span className="w-full truncate text-center text-xs">{contact.name.split(" ")[0]}</span>
        </button>
      ))}
    </div>
  );
}

function SendSheet({ contactId, preset }: { contactId?: string; preset?: Ccy }) {
  const contacts = useKudi((s) => s.contacts);
  const begin = useKudi((s) => s.begin);
  const formError = useKudi((s) => s.formError);
  const balanceKobo = useKudi((s) => s.balanceKobo);
  const pockets = useKudi((s) => s.pockets);
  const [picked, setPicked] = useState(contactId ?? "");
  const [query, setQuery] = useState("");
  const [raw, setRaw] = useState("");
  const [note, setNote] = useState("");
  const [fund, setFund] = useState<Ccy>(preset ?? contacts.find((c) => c.id === contactId)?.currency ?? "USD");
  const [review, setReview] = useState(false);
  const typed = query.trim();
  const emailish = typed.includes("@");
  const matched =
    !typed || emailish
      ? undefined
      : contacts.find((c) => {
          const needle = typed.toLowerCase().replace(/^@/, "");
          return c.aliases.some((alias) => alias === needle) || c.name.toLowerCase().startsWith(needle);
        });
  const contact = matched ?? (!typed ? contacts.find((c) => c.id === picked) : undefined);
  const useEmail = emailish;
  const receiveCcy: Ccy = useEmail ? "USD" : (contact?.currency ?? fund);
  const payWith: Ccy = useEmail ? "USD" : fund;
  const minor = Number(raw || "0") * 100;
  const receiveMinor = convertMinor(payWith, receiveCcy, minor);
  const available = payWith === "NGN" ? balanceKobo : pockets[payWith];
  const who = useEmail ? typed : (contact?.name ?? typed);
  const ready = minor >= minMinor(payWith) && (useEmail ? typed.includes("@") : Boolean(contact) || typed.length > 1);

  function confirm() {
    begin({
      type: "send",
      contactId: useEmail ? undefined : contact?.id,
      email: useEmail ? typed : undefined,
      name: who,
      amountKobo: convertMinor(payWith, "NGN", minor),
      note: note.trim(),
      rail: useEmail ? "paypal" : "naira",
      usdCents: payWith === "USD" ? minor : undefined,
      ccy: payWith,
      minor,
      payCcy: receiveCcy,
    });
  }

  if (review) {
    return (
      <Frame
        title="Review"
        footer={
          <button type="button" className="press h-12 w-full rounded-full bg-leaf text-base font-semibold text-on" onClick={confirm}>
            {useEmail ? "Continue to PayPal sandbox" : "Confirm transfer"}
          </button>
        }
      >
        <button type="button" className="mb-3 text-sm font-semibold text-leaf-deep" onClick={() => setReview(false)}>
          Edit
        </button>
        <dl className="surface space-y-3 rounded-3xl p-4 text-sm">
          <ReviewLine k="To" v={who} />
          <ReviewLine k="You pay" v={formatCcy(payWith, minor)} />
          <ReviewLine k="They receive" v={formatCcy(receiveCcy, receiveMinor)} />
          <ReviewLine k="Note" v={note.trim() || "—"} />
          <ReviewLine k="Fee" v={formatCcy(payWith, 0)} />
          <ReviewLine k="Route" v={useEmail ? "PayPal sandbox · not a wallet credit" : contact ? "Kudi contact" : "Demo handle · not a live delivery"} />
        </dl>
        {formError ? <p className="mt-3 text-sm text-coral">{formError}</p> : null}
      </Frame>
    );
  }

  return (
    <Frame
      title="Send"
      footer={
        <button
          type="button"
          className="press h-12 w-full rounded-full bg-leaf text-base font-semibold text-on disabled:opacity-40"
          disabled={!ready}
          onClick={() => setReview(true)}
        >
          Review
        </button>
      }
    >
      <People
        selected={contact?.id}
        onPick={(c) => {
          setPicked(c.id);
          setQuery("");
          setFund(preset ?? c.currency);
          setRaw("");
        }}
      />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value.slice(0, 80));
          setPicked("");
        }}
        placeholder="Email, @handle, or name"
        aria-label="Recipient"
        className="mb-3 h-12 w-full rounded-2xl border border-line bg-card px-3 text-sm outline-none"
      />
      {useEmail ? (
        <p className="mb-3 text-sm text-muted">Dollars leave via PayPal sandbox. Approving that order does not create spendable funds.</p>
      ) : (
        <div className="mb-3">
          <CcyChips value={payWith} onChange={(code) => { setFund(code); setRaw(""); }} />
        </div>
      )}
      <p className="text-center font-display text-5xl tabular-nums">{formatCcy(payWith, minor)}</p>
      {payWith !== receiveCcy && minor > 0 ? (
        <p className="mt-1 text-center text-sm text-muted">
          {(contact?.name ?? who).split(" ")[0]} gets {formatCcy(receiveCcy, receiveMinor)}
        </p>
      ) : (
        <p className="mt-1 text-center text-sm text-muted">Paying in {RATES[receiveCcy].name.toLowerCase()}</p>
      )}
      <p className="mt-1 text-center text-xs text-muted">
        You have {formatCcy(payWith, available)}
        {payWith !== receiveCcy ? ` · ${rateLine(payWith, receiveCcy)}` : " · no fee in this demo"}
      </p>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 80))}
        placeholder="What’s it for?"
        aria-label="Payment note"
        className="mt-3 h-12 w-full rounded-2xl border border-line bg-card px-3 text-sm outline-none"
      />
      {formError ? <p className="mt-2 text-center text-sm text-coral">{formError}</p> : null}
      <div className="mt-4">
        <Keypad onKey={(key) => setRaw((value) => pushDigit(value, key))} />
      </div>
    </Frame>
  );
}

function ReviewLine({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-semibold">{v}</dd>
    </div>
  );
}

function RequestSheet({ contactId }: { contactId?: string }) {
  const contacts = useKudi((s) => s.contacts);
  const begin = useKudi((s) => s.begin);
  const formError = useKudi((s) => s.formError);
  const [picked, setPicked] = useState(contactId ?? contacts[0]?.id ?? "");
  const [raw, setRaw] = useState("");
  const [note, setNote] = useState("");
  const [ccy, setCcy] = useState<Ccy>("USD");
  const contact = contacts.find((c) => c.id === picked);
  const minor = Number(raw || "0") * 100;

  return (
    <Frame
      title="Request"
      footer={
        <button
          type="button"
          className="press h-12 w-full rounded-full bg-ink text-base font-semibold text-on disabled:opacity-40"
          disabled={!contact || minor < minMinor(ccy)}
          onClick={() =>
            contact &&
            begin({
              type: "request",
              contactId: contact.id,
              name: contact.name,
              amountKobo: convertMinor(ccy, "NGN", minor),
              note: note.trim(),
              ccy,
              minor,
            })
          }
        >
          Ask {contact?.name.split(" ")[0] ?? "them"}
        </button>
      }
    >
      <People selected={picked} onPick={(c) => setPicked(c.id)} />
      <div className="mb-3">
        <CcyChips value={ccy} onChange={setCcy} />
      </div>
      <p className="text-center font-display text-5xl tabular-nums">{formatCcy(ccy, minor)}</p>
      <p className="mt-1 text-center text-sm text-muted">They see a request. Nothing moves until you mark it paid in Activity.</p>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 80))}
        placeholder="What’s it for?"
        aria-label="Request note"
        className="mt-3 h-12 w-full rounded-2xl border border-line bg-card px-3 text-sm outline-none"
      />
      {formError ? <p className="mt-2 text-center text-sm text-coral">{formError}</p> : null}
      <div className="mt-4">
        <Keypad onKey={(key) => setRaw((value) => pushDigit(value, key))} />
      </div>
    </Frame>
  );
}

function AirtimeSheet() {
  const profile = useKudi((s) => s.profile);
  const begin = useKudi((s) => s.begin);
  const formError = useKudi((s) => s.formError);
  const [network, setNetwork] = useState("MTN");
  const [phone, setPhone] = useState(profile.phone);
  const [raw, setRaw] = useState("500");
  const amountKobo = Number(raw || "0") * 100;

  return (
    <Frame
      title="Airtime"
      footer={
        <button
          type="button"
          className="press h-12 w-full rounded-full bg-leaf text-base font-semibold text-paper disabled:opacity-40"
          disabled={amountKobo < MIN_SEND_KOBO || phone.trim().length < 8}
          onClick={() =>
            begin({
              type: "airtime",
              phone: phone.trim(),
              network,
              amountKobo,
              name: phone.trim(),
            })
          }
        >
          Buy {formatNgn(amountKobo)}
        </button>
      }
    >
      <div className="mb-3 flex gap-2">
        {NETWORKS.map((item) => (
          <button
            key={item}
            type="button"
            className={cn(
              "press h-10 flex-1 rounded-full text-sm font-semibold",
              network === item ? "bg-ink text-paper" : "bg-card text-ink",
            )}
            onClick={() => setNetwork(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="mb-3 h-12 w-full rounded-2xl bg-card px-3 text-sm outline-none"
        inputMode="tel"
      />
      <p className="text-center font-display text-5xl tabular-nums">{formatNgn(amountKobo)}</p>
      {formError ? <p className="mt-2 text-center text-sm text-coral">{formError}</p> : null}
      <div className="mt-4">
        <Keypad onKey={(key) => setRaw((value) => pushDigit(value, key))} />
      </div>
    </Frame>
  );
}

function TopupSheet() {
  const begin = useKudi((s) => s.begin);
  const formError = useKudi((s) => s.formError);
  const [raw, setRaw] = useState("25");
  const usdCents = Number(raw || "0") * 100;

  return (
    <Frame
      title="Buy dollars"
      footer={
        <button
          type="button"
          className="press h-12 w-full rounded-full bg-leaf text-base font-semibold text-paper disabled:opacity-40"
          disabled={usdCents < 100}
          onClick={() => begin({ type: "topup", usdCents })}
        >
          Continue with PayPal
        </button>
      }
    >
      <p className="text-sm text-muted">
        PayPal sandbox. Approving the order does not add spendable dollars. After the server records approval, a separate step posts them to this demo pocket. Not a bank balance.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {DOLLAR_BUYS.map((dollars) => (
          <button
            key={dollars}
            type="button"
            className={cn(
              "press h-12 rounded-2xl text-sm font-semibold",
              raw === String(dollars) ? "bg-ink text-paper" : "bg-card text-ink",
            )}
            onClick={() => setRaw(String(dollars))}
          >
            {formatUsd(dollars * 100)}
          </button>
        ))}
      </div>
      <p className="mt-4 text-center font-display text-5xl tabular-nums">{formatUsd(usdCents)}</p>
      <p className="mt-1 text-center text-sm text-muted">{rateLine("USD", "NGN")} · {rateLine("USD", "GHS")}</p>
      {formError ? <p className="mt-2 text-center text-sm text-coral">{formError}</p> : null}
      <div className="mt-4">
        <Keypad onKey={(key) => setRaw((value) => pushDigit(value, key))} />
      </div>
    </Frame>
  );
}

function ConvertSheet({ from, to }: { from?: Ccy; to?: Ccy }) {
  const begin = useKudi((s) => s.begin);
  const formError = useKudi((s) => s.formError);
  const balanceKobo = useKudi((s) => s.balanceKobo);
  const pockets = useKudi((s) => s.pockets);
  const [source, setSource] = useState<Ccy>(from ?? "USD");
  const [dest, setDest] = useState<Ccy>(to && to !== (from ?? "USD") ? to : "GHS");
  const [raw, setRaw] = useState("");
  const minor = Number(raw || "0") * 100;
  const out = convertMinor(source, dest, minor);
  const available = source === "NGN" ? balanceKobo : pockets[source];

  function pickSource(code: Ccy) {
    setSource(code);
    if (code === dest) setDest(CCY_LIST.find((item) => item !== code) ?? "USD");
    setRaw("");
  }

  function pickDest(code: Ccy) {
    if (code === source) return;
    setDest(code);
  }

  return (
    <Frame
      title="Convert"
      footer={
        <button
          type="button"
          className="press h-12 w-full rounded-full bg-leaf text-base font-semibold text-paper disabled:opacity-40"
          disabled={source === dest || minor < minMinor(source)}
          onClick={() => begin({ type: "convert", from: source, to: dest, minor })}
        >
          Convert now
        </button>
      }
    >
      <p className="text-sm text-muted">Demo rates, no fee. Dollars, naira, cedis, and shillings stay in this wallet until you spend them.</p>
      <p className="mt-3 text-xs font-semibold text-muted">From · you have {formatCcy(source, available)}</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {CCY_LIST.map((code) => (
          <button
            key={code}
            type="button"
            className={cn("press h-10 rounded-full text-xs font-semibold", source === code ? "bg-ink text-paper" : "bg-card")}
            onClick={() => pickSource(code)}
          >
            {code}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold text-muted">To</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {CCY_LIST.map((code) => (
          <button
            key={code}
            type="button"
            disabled={code === source}
            className={cn(
              "press h-10 rounded-full text-xs font-semibold disabled:opacity-30",
              dest === code ? "bg-leaf text-paper" : "bg-card",
            )}
            onClick={() => pickDest(code)}
          >
            {code}
          </button>
        ))}
      </div>
      <p className="mt-4 text-center font-display text-5xl tabular-nums">{formatCcy(source, minor)}</p>
      <p className="mt-1 text-center text-sm font-semibold text-leaf-deep">You get {formatCcy(dest, out)}</p>
      <p className="mt-1 text-center text-xs text-muted">{rateLine(source, dest)}</p>
      {formError ? <p className="mt-2 text-center text-sm text-coral">{formError}</p> : null}
      <div className="mt-4">
        <Keypad onKey={(key) => setRaw((value) => pushDigit(value, key))} />
      </div>
    </Frame>
  );
}

function PinSheet() {
  const pinFor = useKudi((s) => s.pinFor);
  const submitPin = useKudi((s) => s.submitPin);
  const cancelPin = useKudi((s) => s.cancelPin);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const label = describeAction(pinFor);

  function press(key: string) {
    if (key === "del") {
      setPin((value) => value.slice(0, -1));
      setError(null);
      return;
    }
    const next = `${pin}${key}`.replace(/\D/g, "").slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      const result = submitPin(next);
      if (!result.ok) {
        setError(result.error);
        setPin("");
      }
    }
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-paper">
      <header className="flex items-center gap-2 px-3 py-3">
        <button
          type="button"
          className="press flex size-11 items-center justify-center rounded-full bg-card"
          aria-label="Back"
          onClick={cancelPin}
        >
          <ChevronLeft className="size-5" />
        </button>
        <h2 className="font-display text-2xl">PIN</h2>
      </header>
      <div className="px-4">
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 text-sm text-muted">Demo PIN is 1234. Change it under Profile.</p>
        <div className="mt-6 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("size-3 rounded-full", pin.length > i ? "bg-ink" : "bg-line")} />
          ))}
        </div>
        {error ? <p className="mt-3 text-center text-sm text-coral">{error}</p> : null}
        <div className="mt-6">
          <Keypad onKey={press} />
        </div>
      </div>
    </div>
  );
}

function describeAction(action: ReturnType<typeof useKudi.getState>["pinFor"]): string {
  if (!action) return "Confirm this payment.";
  if (action.type === "send") {
    const ccy = action.ccy ?? "NGN";
    const minor = action.minor ?? action.amountKobo;
    const got = action.payCcy && action.payCcy !== ccy ? ` They get ${formatCcy(action.payCcy, convertMinor(ccy, action.payCcy, minor))}.` : "";
    return `Send ${formatCcy(ccy, minor)} to ${action.name}.${got}`;
  }
  if (action.type === "airtime") return `Buy ${formatNgn(action.amountKobo)} airtime.`;
  if (action.type === "convert") return `Convert ${formatCcy(action.from, action.minor)} to ${RATES[action.to].name.toLowerCase()}.`;
  if (action.type === "payRequest") return "Pay this request.";
  return "Confirm.";
}

function PaypalSheet({ txnId }: { txnId: string }) {
  const txn = useKudi((s) => s.txns.find((item) => item.id === txnId));
  const approve = useKudi((s) => s.approvePaypal);
  const post = useKudi((s) => s.postDemo);
  const cancel = useKudi((s) => s.cancelPaypal);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!txn?.paypalOrderId || txn.kind !== "topup") return;
    const cents = txn.minor ?? 0;
    if (cents <= 0) return;
    void openSandboxPayment({ data: { id: txn.id, usdCents: cents, title: txn.title } }).catch(() => {
      setError("The sandbox order could not be saved on the account yet.");
    });
  }, [txn?.id, txn?.kind, txn?.minor, txn?.paypalOrderId, txn?.title]);
  if (!txn) return null;
  const priced = txn.ccy ?? "NGN";
  const pricedMinor = txn.minor ?? txn.amountKobo;
  const usdCents = priced === "USD" ? pricedMinor : convertMinor(priced, "USD", pricedMinor);
  const usd = (usdCents / 100).toFixed(2);
  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: txn.paypalOrderId,
        description: txn.kind === "topup" ? "Kudi demo dollar pocket" : `Kudi transfer to ${txn.title}`,
        amount: { currency_code: "USD", value: usd },
      },
    ],
  };
  const sandboxOk = txn.paypalPhase === "sandbox_ok" || txn.paypalPhase === "posted";

  async function onCaptured(orderId: string) {
    if (!txn) return;
    setBusy(true);
    setError(null);
    try {
      const cents = Math.max(1, usdCents);
      await openSandboxPayment({ data: { id: txn.id, usdCents: cents, title: txn.title } }).catch(() => undefined);
      const result = await recordPaypalCapture({
        data: {
          id: txn.id,
          paypalOrderId: orderId,
          usdCents: cents,
          title: txn.title,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      approve(txn.id, orderId, result.usdCents);
    } catch {
      setError("PayPal captured the order, but it was not saved on this account.");
    } finally {
      setBusy(false);
    }
  }

  async function onPost() {
    setBusy(true);
    setError(null);
    try {
      const result = await postDemoLedger({ data: { id: txn!.id } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      post(txn!.id);
    } catch {
      setError("The demo ledger did not accept this order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Frame
      title="PayPal"
      footer={
        <div className="flex flex-col gap-2">
          {txn.paypalPhase !== "posted" ? (
            sandboxOk && txn.kind === "topup" ? (
              <button type="button" disabled={busy} className="press h-12 w-full rounded-full bg-leaf text-sm font-semibold text-paper" onClick={() => void onPost()}>
                Add to demo pocket
              </button>
            ) : sandboxOk ? null : (
              <PaypalCheckout usd={usd} description={payload.purchase_units[0]?.description ?? "Kudi"} onCaptured={(orderId) => void onCaptured(orderId)} onFailed={setError} />
            )
          ) : null}
          <button type="button" className="press h-12 w-full rounded-full bg-card text-sm font-semibold" onClick={() => cancel(txn.id)}>
            Cancel
          </button>
        </div>
      }
    >
      <p className="text-sm text-muted">
        PayPal sandbox. After you pay, the server checks the order with PayPal. That still does not add spendable funds until you add it to the demo pocket.
      </p>
      <p className="mt-4 font-display text-4xl tabular-nums">{formatTxnAmount(txn)}</p>
      <p className="text-sm text-muted">{txn.fxLabel ?? formatUsd(usdCents)} · {txn.title}</p>
      <p className="mt-3 text-xs font-semibold text-muted">Order {txn.paypalOrderId}</p>
      <p className="mt-1 text-xs font-semibold text-leaf-deep">
        {txn.paypalPhase === "posted" ? "Posted to demo ledger" : sandboxOk ? "Captured by PayPal. Not in the pocket yet." : "Waiting for PayPal"}
      </p>
      {error ? <p className="mt-2 text-sm text-coral">{error}</p> : null}
    </Frame>
  );
}

function ReceiveSheet() {
  const profile = useKudi((s) => s.profile);
  const txns = useKudi((s) => s.txns);
  const setSheet = useKudi((s) => s.setSheet);
  const [copied, setCopied] = useState(false);
  const details = `${profile.name}\n${profile.handle}\nCountry ${profile.country}\nPay this handle inside Kudi. Demo wallet.`;
  const incoming = txns.filter((t) => t.direction === "in" && t.status !== "cancelled").slice(0, 4);

  async function copy() {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Pay me on Kudi", text: details });
        return;
      } catch {
        return;
      }
    }
    await copy();
  }

  return (
    <Frame
      title="Receive"
      footer={
        <button type="button" className="press h-12 w-full rounded-full bg-leaf text-sm font-semibold text-on" onClick={() => setSheet({ name: "request" })}>
          Request money
        </button>
      }
    >
      <p className="text-sm text-muted">Share this handle. It is not a bank account number.</p>
      <div className="mt-4 rounded-3xl border border-line bg-card p-4">
        <p className="text-xs font-semibold text-muted">Your receiving id</p>
        <p className="mt-1 font-display text-3xl">{profile.handle}</p>
        <p className="mt-2 text-sm">{profile.name}</p>
        <p className="text-sm text-muted">{profile.country} · {profile.phone}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="press flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-card text-sm font-semibold" onClick={() => void copy()}>
          <Copy className="size-4" />
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" className="press h-12 flex-1 rounded-full bg-ink text-sm font-semibold text-on" onClick={() => void share()}>
          Share
        </button>
      </div>
      <h3 className="mt-5 font-semibold">Incoming</h3>
      <ul className="surface mt-2 overflow-hidden rounded-3xl">
        {incoming.length === 0 ? (
          <li className="px-4 py-4 text-sm text-muted">No incoming payments yet.</li>
        ) : (
          incoming.map((txn) => (
            <li key={txn.id} className="border-b border-line last:border-b-0">
              <button type="button" className="press flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setSheet({ name: "detail", txnId: txn.id })}>
                <span>
                  <span className="block font-semibold">{txn.title}</span>
                  <span className="text-sm text-muted">{txn.status === "pending" ? "Pending" : "Completed"}</span>
                </span>
                <span className="font-semibold tabular-nums">{formatTxnAmount(txn)}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </Frame>
  );
}

function DetailSheet({ txnId }: { txnId: string }) {
  const txn = useKudi((s) => s.txns.find((item) => item.id === txnId));
  const setSheet = useKudi((s) => s.setSheet);
  if (!txn) return null;
  return (
    <Frame
      title="Receipt"
      footer={
        <button type="button" className="press h-12 w-full rounded-full bg-leaf text-sm font-semibold text-paper" onClick={() => setSheet(null)}>
          Close
        </button>
      }
    >
      <p className="font-display text-4xl tabular-nums">{formatTxnAmount(txn)}</p>
      <p className="mt-2 font-semibold">{labelForReceipt(txn)}</p>
      <dl className="mt-4 space-y-3 text-sm">
        <Row k="Status" v={txn.status} />
        <Row k="Note" v={txn.note || "—"} />
        <Row k="When" v={txn.createdAt.slice(0, 16).replace("T", " ")} />
        {txn.fxLabel ? <Row k="Quote" v={txn.fxLabel} /> : null}
        {txn.paypalOrderId ? <Row k="PayPal" v={`${txn.paypalOrderId} · ${txn.paypalPhase ?? txn.status}`} /> : null}
      </dl>
      <p className="mt-4 text-xs text-muted">Demo receipt. Not a regulated payment confirmation.</p>
    </Frame>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-2">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-semibold">{v}</dd>
    </div>
  );
}

function labelForReceipt(txn: { kind: string; title: string; direction: string }): string {
  if (txn.kind === "fx") return txn.title;
  if (txn.kind === "topup") return "Dollar purchase";
  if (txn.kind === "airtime") return txn.title;
  return txn.direction === "in" ? `From ${txn.title}` : `To ${txn.title}`;
}

function SuccessSheet({ txnId }: { txnId: string }) {
  const txn = useKudi((s) => s.txns.find((item) => item.id === txnId));
  const setSheet = useKudi((s) => s.setSheet);
  const setTab = useKudi((s) => s.setTab);
  if (!txn) return null;
  const headline =
    txn.kind === "request" && txn.direction === "in"
      ? `Asked ${txn.title}`
      : txn.kind === "receive"
        ? `Received from ${txn.title}`
        : txn.kind === "topup"
          ? "Added to demo pocket"
          : txn.kind === "fx"
            ? "Converted"
            : txn.kind === "airtime"
            ? "Airtime sent"
            : `Sent to ${txn.title}`;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-paper px-5 pt-16">
      <span className="flex size-16 items-center justify-center rounded-full bg-mint text-leaf-deep">
        <Check className="size-8" />
      </span>
      <h2 className="mt-4 font-display text-4xl">{headline}</h2>
      <p className="mt-2 font-display text-3xl tabular-nums">{formatTxnAmount(txn)}</p>
      {txn.counterCcy && txn.counterMinor != null ? (
        <p className="mt-1 text-sm text-muted">
          {txn.kind === "fx" ? "Arrived" : "They get"} {formatCcy(txn.counterCcy, txn.counterMinor)}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-muted">{txn.note}</p>
      {txn.paypalOrderId ? <p className="mt-2 text-xs text-muted">PayPal {txn.paypalOrderId}</p> : null}
      <button
        type="button"
        className="press mt-8 h-12 rounded-full bg-leaf text-base font-semibold text-paper"
        onClick={() => {
          setSheet(null);
          setTab("home");
        }}
      >
        Done
      </button>
    </div>
  );
}
