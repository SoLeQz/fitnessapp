import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "../actions";
import { ActionForm } from "@/components/ui/action-form";
import { Card, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { safeInternalPath } from "@/lib/navigation";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; redirectTo?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = safeInternalPath(params.redirectTo);

  return (
    <Card>
      <CardBody className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Connexion</h1>
          <p className="mt-1 text-sm text-fg-muted">Reprenez là où vous vous êtes arrêté.</p>
        </div>

        {params.reset === "1" ? (
          <Alert tone="success">Mot de passe mis à jour. Vous pouvez vous connecter.</Alert>
        ) : null}

        <ActionForm
          action={loginAction}
          submitLabel="Se connecter"
          pendingLabel="Connexion…"
          hidden={{ redirectTo }}
          fields={[
            {
              name: "email",
              label: "Email",
              type: "email",
              inputMode: "email",
              autoComplete: "email",
              placeholder: "vous@exemple.com",
              required: true,
            },
            {
              name: "password",
              label: "Mot de passe",
              type: "password",
              autoComplete: "current-password",
              required: true,
            },
          ]}
        />

        <div className="flex items-center justify-between text-xs">
          <Link href="/forgot-password" className="text-fg-muted hover:text-fg">
            Mot de passe oublié ?
          </Link>
          <Link href="/register" className="font-medium text-accent hover:text-accent-hover">
            Créer un compte
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
