import { useState } from "react";
import { authClient, GROK_PROVIDERS, signIn } from "@/lib/auth/client";

export function AuthWall() {
  const [mode, setMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === "up"
          ? await authClient.signUp.email({ email, password, name: name || "Kudi", callbackURL: "/" })
          : await authClient.signIn.email({ email, password, callbackURL: "/" });
      if (result.error) setError(result.error.message || "That email or password was not accepted.");
    } catch {
      setError("Could not reach the account service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper px-5 pt-12 pb-8 text-ink">
      <p className="text-sm font-semibold text-leaf-deep">Kudi</p>
      <h1 className="mt-2 font-display text-4xl">Your dollars, for the continent.</h1>
      <p className="mt-2 text-sm text-muted">Create an account to hold a demo wallet. No real money moves here.</p>
      <div className="mt-6 flex flex-col gap-2">
        {GROK_PROVIDERS.map((provider) => (
          <button
            key={provider.providerId}
            type="button"
            className="press h-12 rounded-full border border-line bg-card text-sm font-semibold"
            onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
          >
            Continue with {provider.label}
          </button>
        ))}
      </div>
      <form className="mt-6 space-y-2" onSubmit={(e) => void onSubmit(e)}>
        {mode === "up" ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            aria-label="Full name"
            className="h-12 w-full rounded-2xl border border-line bg-card px-3 outline-none"
          />
        ) : null}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="Email"
          aria-label="Email"
          className="h-12 w-full rounded-2xl border border-line bg-card px-3 outline-none"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          minLength={8}
          placeholder="Password"
          aria-label="Password"
          className="h-12 w-full rounded-2xl border border-line bg-card px-3 outline-none"
        />
        {error ? <p className="text-sm text-coral">{error}</p> : null}
        <button type="submit" disabled={busy} className="press h-12 w-full rounded-full bg-leaf font-semibold text-on disabled:opacity-40">
          {mode === "up" ? "Create account" : "Log in"}
        </button>
      </form>
      <button type="button" className="mt-3 text-sm font-semibold text-leaf-deep" onClick={() => setMode(mode === "up" ? "in" : "up")}>
        {mode === "up" ? "I already have an account" : "Create an account"}
      </button>
    </main>
  );
}
