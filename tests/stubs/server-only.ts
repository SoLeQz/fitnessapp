/**
 * Remplaçant du paquet `server-only` pour les tests.
 *
 * En production, ce paquet fait échouer la compilation si un module serveur est
 * importé dans un bundle client. Les tests s'exécutent en Node, hors de tout
 * bundler : la garde n'a pas de sens et son import réel lèverait une erreur.
 */
export {};
