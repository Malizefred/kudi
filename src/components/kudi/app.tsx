import { useEffect, useState } from "react";
import { ArrowLeftRight, House, ReceiptText, CircleUser, Wallet } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useKudi } from "@/lib/kudi/store";
import { Activity } from "@/components/kudi/activity";
import { Assistant } from "@/components/kudi/assistant";
import { AuthWall } from "@/components/kudi/auth-wall";
import { Exchange } from "@/components/kudi/exchange";
import { Home } from "@/components/kudi/home";
import { Me } from "@/components/kudi/me";
import { Onboarding } from "@/components/kudi/onboarding";
import { Sheets } from "@/components/kudi/sheets";
import { Wallets } from "@/components/kudi/wallets";
import { cn } from "@/components/kudi/ui";

export function KudiApp() {
  const onboarded = useKudi((s) => s.profile.onboarded);
  const hydrated = useKudi((s) => s.hydrated);
  const setHydrated = useKudi((s) => s.setHydrated);

  const session = useCurrentUserState();

  useEffect(() => {
    void Promise.resolve(useKudi.persist.rehydrate()).then(() => setHydrated(true));
  }, [setHydrated]);

  if (session.isPending) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-paper px-5 pt-12 text-ink">
        <p className="text-sm font-semibold text-leaf-deep">Kudi</p>
        <h1 className="mt-2 font-display text-4xl">Opening your wallets.</h1>
      </main>
    );
  }

  if (!session.user) return <AuthWall />;

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-paper px-5 pt-12 text-ink">
        <p className="font-display text-3xl">Kudi</p>
        <p className="mt-2 text-sm text-muted">Opening your wallets.</p>
      </main>
    );
  }

  return onboarded ? <Shell /> : <Onboarding />;
}

function Shell() {
  const tab = useKudi((s) => s.tab);
  const setTab = useKudi((s) => s.setTab);
  const wide = useWide();
  const showChat = tab === "chat";

  return (
    <main className="mx-auto flex h-dvh max-w-5xl bg-paper text-ink">
      <section className="relative mx-auto flex h-dvh w-full max-w-md flex-col border-line md:border-r">
        <div className={cn("min-h-0 flex-1", showChat && !wide ? "flex flex-col" : "overflow-y-auto")}>
          {tab === "home" ? <Home /> : null}
          {tab === "wallets" ? <Wallets /> : null}
          {tab === "exchange" ? <Exchange /> : null}
          {tab === "activity" ? <Activity /> : null}
          {tab === "profile" ? <Me /> : null}
          {showChat && !wide ? <Assistant /> : null}
        </div>
        <nav className="grid grid-cols-5 border-t border-line bg-card px-1 pb-1">
          <TabButton icon={House} label="Home" active={tab === "home"} onClick={() => setTab("home")} />
          <TabButton icon={Wallet} label="Wallets" active={tab === "wallets"} onClick={() => setTab("wallets")} />
          <TabButton icon={ArrowLeftRight} label="Exchange" active={tab === "exchange"} onClick={() => setTab("exchange")} />
          <TabButton icon={ReceiptText} label="Activity" active={tab === "activity"} onClick={() => setTab("activity")} />
          <TabButton icon={CircleUser} label="Profile" active={tab === "profile"} onClick={() => setTab("profile")} />
        </nav>
        <Sheets />
      </section>
      {wide ? (
        <aside className="hidden h-dvh min-w-0 flex-1 md:flex">
          <Assistant />
        </aside>
      ) : null}
    </main>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof House;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn("press flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold", active ? "text-leaf" : "text-muted")}
      onClick={onClick}
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const apply = () => setWide(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return wide;
}
