# ForgeFit

Application de suivi de musculation : séances, charges, progression et records
personnels. Pensée pour être utilisée **pendant** la séance, sur téléphone.

Le geste central : ouvrir l'application à la salle, appuyer sur **Démarrer
ma séance Push**, voir immédiatement ce qui a été fait la fois précédente sur
chaque exercice, saisir les séries, terminer.

## Démarrage

Prérequis : **Node 20+** et **Docker** (pour PostgreSQL).

```bash
# 1. Base de données
docker compose up -d

# 2. Dépendances et client Prisma
npm install

# 3. Variables d'environnement
cp .env.example .env
#    puis remplacer AUTH_SECRET par une valeur aléatoire :
#    openssl rand -base64 48

# 4. Schéma + catalogue d'exercices
npm run db:deploy
npm run db:seed

# 5. Lancement
npm run dev
```

L'application est sur <http://localhost:3000>. Créez un compte via
**S'inscrire**.

### Jeu de données de démonstration

Pour explorer l'application avec 8 semaines d'historique déjà en place :

```bash
SEED_DEMO=1 npm run db:seed
```

Compte créé : `demo@forgefit.local` / `ForgeFitDemo2026`. Il contient un
programme Push Pull Legs, 24 séances avec progression, deux machines
différentes sur le Chest Press (une en kilos, une en niveaux) et un suivi de
poids corporel.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` · `npm start` | Build et exécution en production |
| `npm test` | Tests unitaires et d'intégration (base `forgefit_test` créée automatiquement) |
| `npm run lint` · `npm run typecheck` | ESLint et TypeScript |
| `npm run db:up` · `db:down` | Conteneur PostgreSQL |
| `npm run db:migrate` | Nouvelle migration en développement |
| `npm run db:deploy` | Appliquer les migrations (production) |
| `npm run db:seed` | Catalogue d'exercices (+ démo avec `SEED_DEMO=1`) |
| `npm run db:studio` | Explorateur de base Prisma |

## Fonctionnalités

**Séance en direct** — démarrage depuis un programme ou libre, dernière
performance affichée sous chaque exercice, saisie à gros boutons, boutons
« copier la série précédente » et « copier la dernière séance », édition d'une
série déjà validée, enregistrement immédiat à chaque série, timer de repos qui
continue de tourner pendant la navigation.

**Historique et progression** — historique complet par exercice séance par
séance, charge maximale, meilleures répétitions par charge, volume, 1RM estimé,
graphiques de progression, indicateur 🟢 / 🟡 / 🔴 entre les deux dernières
séances.

**Machines** — un même exercice peut avoir plusieurs machines, chacune avec son
unité (kilos, livres, niveaux) et son pas de progression. Les charges ne sont
jamais comparées d'une machine à l'autre.

**Le reste** — bibliothèque d'exercices avec recherche, filtres et favoris ;
exercices personnels ; programmes multi-jours ; tableau de bord ; statistiques ;
records personnels ; calendrier mensuel ; suivi du poids corporel ; comptes
utilisateurs isolés ; installation en PWA.

## Documentation

L'architecture, le modèle de données et les décisions structurantes sont
décrits dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Déploiement

L'application est un projet Next.js standard : `npm run build` puis
`npm start`, avec `DATABASE_URL` pointant vers un PostgreSQL 15+ et
`npm run db:deploy` pour appliquer les migrations.

Deux points à régler avant une mise en ligne réelle :

- **Envoi d'emails** : aucun fournisseur n'est configuré. Les liens de
  réinitialisation de mot de passe sont écrits dans les logs en développement.
  Brancher un service consiste à remplacer le corps de `sendEmail` dans
  [src/server/mailer.ts](src/server/mailer.ts).
- **Limitation de débit** : le compteur anti-bourrinage est en mémoire du
  processus ([src/server/rate-limit.ts](src/server/rate-limit.ts)). Un
  déploiement multi-instances demande un compteur partagé (Redis).

## Avertissement

Les estimations de 1RM sont des extrapolations mathématiques (formule d'Epley),
destinées à comparer des séries entre elles. Ce ne sont pas des charges à
tenter. L'application n'émet aucune recommandation d'entraînement ni conseil de
santé.
