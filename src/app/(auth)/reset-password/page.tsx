import type { Metadata } from "next";
import Link from "next/link";
import { resetPasswordAction } from "../actions";
import { ActionForm } from "@/components/ui/action-form";
import { Card, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { MIN_PASSWORD_LENGTH } from "@/server/validation/auth";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card>
        <CardBody className="space-y-4">
          <Alert tone="danger">Lien de réinitialisation incomplet ou expiré.</Alert>
          <Link
            href="/forgot-password"
            className="block text-center text-xs font-medium text-accent hover:text-accent-hover"
          >
            Demander un nouveau lien
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Nouveau mot de passe</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Choisissez un nouveau mot de passe. Vos autres sessions seront déconnectées.
          </p>
        </div>

        <ActionForm
          action={resetPasswordAction}
          submitLabel="Mettre à jour"
          pendingLabel="Mise à jour…"
          hidden={{ token }}
          fields={[
            {
              name: "password",
              label: "Nouveau mot de passe",
              type: "password",
              autoComplete: "new-password",
              minLength: MIN_PASSWORD_LENGTH,
              hint: `${MIN_PASSWORD_LENGTH} caractères minimum.`,
              required: true,
            },
          ]}
        />
      </CardBody>
    </Card>
  );
}
