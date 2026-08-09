import type { Metadata } from "next";
import Link from "next/link";
import { registerAction } from "../actions";
import { ActionForm } from "@/components/ui/action-form";
import { Card, CardBody } from "@/components/ui/card";
import { MIN_PASSWORD_LENGTH } from "@/server/validation/auth";

export const metadata: Metadata = { title: "Créer un compte" };

export default function RegisterPage() {
  return (
    <Card>
      <CardBody className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Créer un compte</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Vos séances, vos charges, votre progression — à vous seul.
          </p>
        </div>

        <ActionForm
          action={registerAction}
          submitLabel="Créer mon compte"
          pendingLabel="Création…"
          fields={[
            {
              name: "displayName",
              label: "Nom",
              autoComplete: "name",
              placeholder: "Nicolas",
              required: true,
            },
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
              autoComplete: "new-password",
              minLength: MIN_PASSWORD_LENGTH,
              hint: `${MIN_PASSWORD_LENGTH} caractères minimum.`,
              required: true,
            },
          ]}
        />

        <p className="text-center text-xs text-fg-muted">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
            Se connecter
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
