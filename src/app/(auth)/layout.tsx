import Link from "next/link";
import { redirect } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { getCurrentUser } from "@/server/auth/guard";

/** Un utilisateur déjà connecté n'a rien à faire sur les écrans de connexion. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-rise">
        <Link href="/login" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-fg">
            <Dumbbell className="size-5" aria-hidden />
          </span>
          <span className="text-xl font-semibold tracking-tight">ForgeFit</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
