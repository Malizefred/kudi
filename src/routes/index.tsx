import { createFileRoute } from "@tanstack/react-router";
import { KudiApp } from "@/components/kudi/app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <KudiApp />;
}
