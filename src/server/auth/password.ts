import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * Coût bcrypt. 12 correspond à ~250 ms de calcul sur un serveur courant :
 * assez lent pour rendre une attaque par dictionnaire coûteuse, assez rapide
 * pour ne pas dégrader la connexion.
 */
const BCRYPT_COST = 12;

export function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_COST);
}

export function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Empreinte jetable générée au premier appel, pour garantir qu'elle est bien
 * formée (un hash codé en dur et invalide ferait échouer `compare` en quelques
 * microsecondes, ce qui trahirait justement ce qu'on cherche à masquer).
 */
let decoyHash: Promise<string> | null = null;

/**
 * Consomme le même temps qu'une vérification réelle. Appelé quand l'email est
 * inconnu, pour que la durée de la réponse ne révèle pas l'existence d'un compte.
 */
export async function simulatePasswordVerification(): Promise<void> {
  decoyHash ??= bcrypt.hash(randomBytes(16).toString("hex"), BCRYPT_COST);
  await bcrypt.compare("timing-equalizer", await decoyHash);
}
