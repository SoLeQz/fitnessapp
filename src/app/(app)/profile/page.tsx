import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { changePasswordAction, logoutAction, updateProfileAction } from "./actions";
import { PageHeader } from "@/components/layout/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LoadUnit } from "@/generated/prisma/enums";
import { requireUserPage } from "@/server/auth/guard";
import { MIN_PASSWORD_LENGTH } from "@/server/validation/auth";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUserPage();

  return (
    <>
      <PageHeader title="Profil" subtitle={user.email} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Préférences" subtitle="Unité et repos par défaut" />
          <CardBody>
            <ActionForm
              action={updateProfileAction}
              submitLabel="Enregistrer"
              pendingLabel="Enregistrement…"
              fields={[
                {
                  name: "displayName",
                  label: "Nom",
                  defaultValue: user.displayName,
                  autoComplete: "name",
                  required: true,
                },
                {
                  name: "preferredUnit",
                  label: "Unité préférée",
                  defaultValue: user.preferredUnit,
                  hint: "Unité proposée par défaut pour les nouveaux exercices.",
                  options: [
                    { value: LoadUnit.KG, label: "Kilogrammes (kg)" },
                    { value: LoadUnit.LBS, label: "Livres (lbs)" },
                  ],
                },
                {
                  name: "defaultRestSeconds",
                  label: "Repos par défaut (secondes)",
                  type: "number",
                  inputMode: "numeric",
                  defaultValue: user.defaultRestSeconds,
                  min: 0,
                  max: 3600,
                  step: 5,
                  hint: "Durée pré-remplie du timer après une série.",
                  required: true,
                },
              ]}
            />
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Mot de passe" subtitle="Le changer déconnecte tous vos appareils" />
            <CardBody>
              <ActionForm
                action={changePasswordAction}
                submitLabel="Changer le mot de passe"
                pendingLabel="Mise à jour…"
                fields={[
                  {
                    name: "currentPassword",
                    label: "Mot de passe actuel",
                    type: "password",
                    autoComplete: "current-password",
                    required: true,
                  },
                  {
                    name: "newPassword",
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

          <Card>
            <CardBody>
              <form action={logoutAction}>
                <Button type="submit" variant="secondary" size="lg" fullWidth>
                  <LogOut className="size-4" aria-hidden />
                  Se déconnecter
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
