import type { Metadata } from "next";
import Link from "next/link";
import { forgotPasswordAction } from "../actions";
import { ActionForm } from "@/components/ui/action-form";
import { Card, CardBody } from "@/components/ui/card";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardBody className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Indiquez votre adresse : vous recevrez un lien valable une heure.
          </p>
        </div>

        <ActionForm
          action={forgotPasswordAction}
          submitLabel="Envoyer le lien"
          pendingLabel="Envoi…"
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
          ]}
        />

        <p className="text-center text-xs text-fg-muted">
          <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
            Retour à la connexion
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
