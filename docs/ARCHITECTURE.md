# ForgeFit — Architecture

## 1. Stack

| Couche | Choix | Raison |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, RSC) | Rendu serveur rapide sur mobile 4G, un seul déploiement, PWA possible |
| Langage | TypeScript strict (`noUncheckedIndexedAccess` activé) | Typage bout-en-bout du schéma à l'UI |
| Base | PostgreSQL 16 (Docker) | Enums natifs, `Decimal` exact, index partiels, `NULLS NOT DISTINCT` |
| ORM | Prisma 7 | Migrations versionnées, client typé |
| Validation | Zod 4 | Un schéma par entrée utilisateur, réutilisé côté client et serveur |
| Auth | Sessions opaques maison + bcrypt | Contrôle total sur le flux mot de passe oublié, pas de dépendance lourde |
| UI | Tailwind CSS 4 + composants maison | Pas de librairie de composants imposée, thème sombre sur mesure |
| Graphiques | Recharts | Simple, responsive, suffisant pour des courbes de progression |
| État client | Zustand (persisté) | Séance en cours + timer de repos qui survivent à la navigation |
| Tests | Vitest | Rapide, même résolution de modules que Vite |

## 2. Découpage en couches

La règle : **la logique métier ne vit jamais dans un composant React**.

```
src/
  app/                    Routes Next.js (pages, Server Actions, route handlers).
    (auth)/               Pages publiques : connexion, inscription, mot de passe oublié
    (app)/                Pages authentifiées : accueil, séance, exercices, stats...
    api/                  Route handlers REST
  server/                 Tout ce qui ne s'exécute que côté serveur
    auth/                 Hachage, sessions, garde d'accès (`requireUser`)
    services/             Logique métier et accès aux données via Prisma
    validation/           Schémas Zod appliqués à toute entrée externe
    db.ts                 Singleton PrismaClient
    rate-limit.ts         Limitation des tentatives d'authentification
  lib/                    Domaine pur, sans I/O : unités, 1RM, volume, progression, dates
  components/             UI réutilisable (ui/ primitives, charts/ graphiques)
  hooks/                  Hooks React client
```

Dépendances autorisées, dans ce sens uniquement :

```
app/ → server/services/ → prisma
         ↘ lib/ (pur)
components/ → lib/ + hooks/ + Server Actions   (jamais → server/services directement)
```

`lib/` ne dépend d'aucune I/O : c'est le code le plus testé (unités, volume,
1RM, progression). Il n'y a **pas** de couche « repository » séparée : elle
n'aurait fait que réexporter les requêtes Prisma des services. Les services
portent à la fois les règles métier et l'accès aux données, et sont la seule
couche qui connaît le schéma.

Les fonctions qui doivent pouvoir s'exécuter dans une transaction — recalcul des
totaux d'une séance, recalcul des records — prennent le client en premier
argument (`Db = PrismaClient | Prisma.TransactionClient`). C'est ce qui permet
au script de seed de les réutiliser sans dupliquer la logique.

## 3. Modèle de données

```
users ─┬─ sessions
       ├─ password_reset_tokens
       ├─ exercises (ownerId NULL = catalogue commun)
       ├─ exercise_variants ──→ exercises
       ├─ exercise_favorites ─→ exercises
       ├─ workout_programs ─── program_days ─── workout_program_exercises ─→ exercises / variants
       ├─ workouts ─── workout_exercises ─── sets
       │      └──→ program_days (SET NULL : l'historique survit à la suppression du programme)
       ├─ body_weight_entries
       └─ personal_records ─→ exercises / variants / workouts
```

### Trois décisions structurantes

**a. Les variantes de machine (`exercise_variants`)**
Une salle n'est pas l'autre : 60 kg sur une Chest Press Matrix ne vaut pas 60 kg sur
une Technogym, et certaines machines n'affichent que des niveaux. Plutôt que de
dupliquer l'exercice (ce qui casserait l'historique du mouvement), une variante
porte le **label de la machine, son unité et son pas d'incrément**. Les comparaisons
de progression et les records sont calculés **par (exercice, variante)** : on ne
compare jamais deux salles entre elles. Une variante `NULL` signifie « pas de
machine particulière », ce qui reste le cas courant.

**b. L'unité est figée au moment de la saisie**
Chaque série stocke `weight` (valeur saisie), `weightUnit` (unité au moment de la
saisie) et `weightKg` (équivalent canonique en kilos, ou `NULL` si non
convertible). Changer plus tard l'unité d'un exercice ne réécrit donc pas le passé,
et une contrainte en base interdit qu'un « niveau 8 » se retrouve additionné à des
kilogrammes.

**c. Deux agrégats matérialisés, et seulement deux**
`workouts.totalVolumeKg`, `workouts.totalSets`, `workouts.durationSeconds` et la
table `personal_records` sont dérivés des séries. Ils sont recalculés par le
service à chaque modification de série, dans la même transaction. Motif : le
tableau de bord, le calendrier et la page Records sont consultés en permanence et
ne doivent pas rejouer une somme sur tout l'historique. Tout le reste est calculé
à la demande.

### Contraintes posées en base (`20260809160359_integrity_constraints`)

- unicité du nom d'exercice par propriétaire, `NULLS NOT DISTINCT` (catalogue commun inclus) ;
- **une seule séance `IN_PROGRESS` par utilisateur** (index partiel) — c'est ce qui rend « reprendre ma séance » non ambigu ;
- un seul record courant par (utilisateur, exercice, variante, type) ;
- cohérence `status` / `finishedAt`, `finishedAt >= startedAt` ;
- `weightKg` renseigné uniquement pour les unités convertibles ;
- domaines : RPE 1–10, poids et répétitions positifs, poids corporel < 700 kg, séries ≥ 1.

## 4. API

Les mutations passent par des **Server Actions** (formulaires, saisie de séance :
pas d'aller-retour JSON inutile), et une **API REST** expose les mêmes services
pour les besoins client dynamiques et un futur mode hors ligne.

| Méthode | Route | Rôle |
| --- | --- | --- |
| POST | `/api/auth/register` · `/login` · `/logout` | Cycle de session |
| POST | `/api/auth/forgot-password` · `/reset-password` | Réinitialisation |
| GET/PATCH | `/api/me` | Profil, unité préférée, repos par défaut |
| GET/POST | `/api/exercises` | Liste (recherche, filtres, favoris) et création |
| GET/PATCH/DELETE | `/api/exercises/:id` | Détail et édition |
| GET | `/api/exercises/:id/history` | Historique complet par séance |
| GET | `/api/exercises/:id/stats` | Records, volumes, progression, séries 1RM |
| POST/DELETE | `/api/exercises/:id/favorite` | Favoris |
| GET/POST/PATCH/DELETE | `/api/exercises/:id/variants` | Variantes machine |
| GET/POST | `/api/workouts` | Historique et démarrage de séance |
| GET | `/api/workouts/active` | Séance en cours (reprise) |
| PATCH/DELETE | `/api/workouts/:id` | Renommer, notes, terminer, abandonner, supprimer |
| POST/PATCH/DELETE | `/api/workouts/:id/exercises` | Composition de la séance |
| POST/PATCH/DELETE | `/api/workout-exercises/:id/sets` | Saisie des séries |
| GET/POST | `/api/programs` + `/:id` | Programmes, jours, exercices cibles |
| GET/POST/DELETE | `/api/body-weight` | Suivi du poids corporel |
| GET | `/api/records` | Records personnels |
| GET | `/api/stats` | Statistiques générales |

Toute route authentifiée passe par `requireUser()` et **filtre systématiquement
par `userId`** : aucune ressource n'est accessible par simple connaissance de son id.

## 5. Écrans

| Route | Contenu |
| --- | --- |
| `/` | Tableau de bord : séances semaine/mois, volume, dernière séance, records récents, reprise |
| `/workout/active` | **Mode séance** : saisie plein écran, dernière performance, timer de repos |
| `/workouts` · `/workouts/:id` | Historique et détail d'une séance |
| `/exercises` · `/exercises/:id` | Bibliothèque (recherche/filtres) et fiche : historique + graphiques |
| `/programs` · `/programs/:id` | Programmes et jours types |
| `/records` | Records personnels |
| `/calendar` | Calendrier mensuel des séances |
| `/stats` | Statistiques et graphiques |
| `/body-weight` | Poids corporel |
| `/profile` | Compte et préférences |

## 6. Calculs métier (`src/lib/`)

- **Conversion d'unités** : kg ↔ lbs, avec refus explicite pour `LEVEL` / `BODYWEIGHT`.
- **Volume** : `Σ weightKg × reps` sur les séries non échauffement et convertibles.
- **1RM estimé** : formule d'Epley `w × (1 + reps/30)`, appliquée uniquement de
  1 à 12 répétitions et aux unités en poids. Au-delà l'estimation n'a pas de sens
  et n'est pas affichée. C'est une estimation mathématique, jamais une consigne
  d'entraînement.
- **Progression** : comparaison de la meilleure série entre les deux dernières
  séances du même (exercice, variante) → `up` / `flat` / `down`, avec le détail
  (« +5 kg », « +1 répétition »).

Aucune recommandation de charge, de programmation ou de santé n'est générée.

## 7. Sécurité

- **Mots de passe** : bcrypt, coût 12. Longueur minimale 10, maximale 72 (bcrypt
  ignore les octets au-delà).
- **Sessions** : jeton aléatoire de 32 octets ; la base ne stocke que son
  SHA-256. Cookie `HttpOnly`, `SameSite=Lax`, `Secure` en production, 60 jours.
- **Énumération de comptes** : connexion et « mot de passe oublié » répondent à
  l'identique que l'adresse existe ou non, et une vérification bcrypt factice
  égalise les temps de réponse.
- **Réinitialisation** : jeton haché, valable une heure, à usage unique ;
  l'utiliser révoque toutes les sessions existantes.
- **Limitation de débit** : 10 tentatives / 5 min sur connexion et inscription,
  5 / heure sur les mots de passe oubliés. Compteur en mémoire du processus — à
  remplacer par un compteur partagé en déploiement multi-instances.
- **Isolation** : chaque lecture et chaque écriture filtre par `userId`.
  Connaître un identifiant ne donne aucun accès ; c'est couvert par des tests
  d'intégration.
- **Redirections** : seules les destinations internes sont acceptées
  (`safeInternalPath`).
- **En-têtes** : `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`.
- **Erreurs** : seules les erreurs métier exposent leur message ; le reste
  devient un 500 générique, journalisé côté serveur.

## 8. Tests

- **Unitaires** (`src/lib/*.test.ts`) : conversions d'unités, volume, 1RM,
  meilleure série, comparaison de progression.
- **Intégration** (`tests/*.integration.test.ts`) : exécutés contre une base
  PostgreSQL jetable (`forgefit_test`), créée et migrée automatiquement. Ils
  couvrent le cycle de vie d'une séance, le calcul des totaux, la
  renumérotation des séries, la recopie de la séance précédente, la mise à jour
  et la redescente des records, la séparation des machines, et l'isolation
  entre comptes.
