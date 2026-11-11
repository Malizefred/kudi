import { createFileRoute } from "@tanstack/react-router";
import { AuthWall } from "@/components/kudi/auth-wall";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return <AuthWall />;
}
