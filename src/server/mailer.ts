import "server-only";
import { env } from "./env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  body: string;
}

/**
 * Point d'extension unique pour l'envoi d'emails.
 *
 * Aucun fournisseur n'est configuré : en développement le message est écrit
 * dans les logs du serveur (le lien de réinitialisation y est donc lisible),
 * et en production l'absence de transport est signalée bruyamment plutôt que
 * silencieusement ignorée. Brancher un service revient à remplacer le corps de
 * cette fonction.
 */
export async function sendEmail(email: OutgoingEmail): Promise<void> {
  if (env.NODE_ENV === "production") {
    console.error(
      `[mailer] Aucun transport email configuré : le message « ${email.subject} » destiné à ${email.to} n'a pas été envoyé.`,
    );
    return;
  }

  console.info(
    [
      "",
      "──────────── EMAIL (développement) ────────────",
      `À       : ${email.to}`,
      `Objet   : ${email.subject}`,
      "",
      email.body,
      "───────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}
