# Hello World backend

Backend NestJS du réseau social Hello World destiné aux développeurs.

## Prérequis

- Node.js compatible avec le projet et npm
- PostgreSQL local ou une base Systalink Datacloud
- Une URL de connexion PostgreSQL
- Un secret JWT d'au moins 32 caractères aléatoires

## Installation et lancement (PowerShell)

Depuis la racine du dépôt :

```powershell
Set-Location backend
npm install
Copy-Item .env.example .env
```

Modifie ensuite `.env` avec les informations réelles de PostgreSQL et remplace
la valeur JWT par un secret aléatoire. Aucun secret réel ne doit être ajouté au
dépôt. Le backend refuse de démarrer si une variable
obligatoire manque ou contient une valeur d'exemple.

```powershell
npm run start:dev
```

Routes disponibles :

- `GET http://localhost:3000/api/v1/` — vérification basique du serveur
- `GET http://localhost:3000/api/v1/health` — disponibilité PostgreSQL
- `http://localhost:3000/api/docs` — documentation Swagger

Parcours disponibles dans cette première tranche :

- `POST /api/v1/auth/register/init`, puis
  `POST /api/v1/auth/email/verify` et `POST /api/v1/auth/register/complete`
  vérifient l'adresse avant de créer le compte et délivrer la session via un
  cookie HttpOnly. Le flux historique `POST /api/v1/auth/register` reste
  disponible et crée le compte après validation du code ;
  `POST /api/v1/auth/email/resend` renvoie un code si nécessaire
- `POST /api/v1/auth/login` pour les comptes e-mail/mot de passe vérifiés ; la
  session est conservée dans un cookie HttpOnly, pas dans le JSON
- `POST /api/v1/auth/login/code` puis `POST /api/v1/auth/login/verify` pour
  demander et valider un code OTP de connexion à 4 chiffres
- `GET /api/v1/auth/google` et `/api/v1/auth/github` pour OAuth ; les callbacks
  définissent le cookie de session HttpOnly puis redirigent vers le frontend
- `GET /api/v1/users?search=...&page=...&limit=...` pour rechercher et parcourir les utilisateurs par pages
- `GET /api/v1/users/:username`, `GET/PATCH /api/v1/users/me`
- `PUT/DELETE /api/v1/users/:username/follow` pour suivre/ne plus suivre un
  développeur
- `GET/POST /api/v1/posts`, `GET/PATCH/DELETE /api/v1/posts/:postId`
- `POST /api/v1/posts/drafts`, `GET /api/v1/posts/drafts/me` et
  `POST /api/v1/posts/:postId/publish`
- Flux paginés : `GET /api/v1/posts`, `/posts/feed/following`,
  `/posts/feed/for-you` et `/posts/users/:username`
- Likes via `PUT/DELETE /api/v1/posts/:postId/like`, épinglage via
  `PUT/DELETE /api/v1/posts/:postId/pin`, mentions `@handle` résolues sur les
  comptes existants
- Médias de publication via `POST /api/v1/media/posts/signature` puis
  `POST /api/v1/media/posts/confirm`; les identifiants retournés sont fournis
  dans `attachmentIds` lors de la création ou modification d'un post
- `GET/POST /api/v1/posts/:postId/comments` et modification/suppression HTTP
- Questions techniques : `GET/POST /api/v1/posts/:postId/answers`,
  `PUT/DELETE /api/v1/posts/:postId/follow` et
  `PUT/DELETE /api/v1/posts/comments/:commentId/useful`
- Projets open source : `GET/POST /api/v1/projects`, `GET/PATCH /api/v1/projects/:id`,
  `PUT /api/v1/projects/:id/members`, `GET/POST /api/v1/projects/:id/tasks`,
  `PATCH /api/v1/projects/:id/tasks/:taskId`, `GET/POST /api/v1/projects/:id/contributions`
- Aperçu GitHub public et mis en cache :
  `GET /api/v1/github-preview?url=https://github.com/owner/repo`
- `POST /api/v1/media/profile/signature` puis
  `POST /api/v1/media/profile/confirm` pour les photos de profil
- Namespace Socket.IO `/messaging` pour conversations directes/groupes,
  historique, messages persistés et téléversements d'images/vidéos via les
  événements `media:upload-signature` et `media:confirm`

## Configuration

| Variable | Requis | Rôle |
|---|---:|---|
| `NODE_ENV` | Non | `development`, `test` ou `production` |
| `PORT` | Non | Port HTTP, défaut `3000` |
| `DATABASE_URL` | Oui | URL `postgresql://...` |
| `DATABASE_SSL` | Non | Active TLS avec vérification du certificat si `true` |
| `JWT_ACCESS_SECRET` | Oui | Secret JWT d'accès, min. 32 caractères |
| `FRONTEND_API_KEY` | Oui | Clé d'identification de l'application, min. 32 caractères ; doit correspondre à `VITE_API_KEY` du frontend |
| `CORS_ORIGINS` | Non | Origines frontend séparées par des virgules |
| `TRUST_PROXY_HOPS` | Non | Nombre de proxys de confiance pour déterminer l'IP client ; `1` dans Docker Compose |
| `CLOUDINARY_CLOUD_NAME` | Optionnel | Nom du compte Cloudinary |
| `CLOUDINARY_API_KEY` | Optionnel | Clé publique Cloudinary |
| `CLOUDINARY_API_SECRET` | Optionnel | Secret privé Cloudinary, serveur uniquement |
| `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY` | Optionnel | Identifiants SMTP Brevo (login SMTP et clé SMTP, pas la clé API) |
| `BREVO_FROM_EMAIL` | Optionnel | Adresse expéditeur vérifiée dans Brevo |
| `BREVO_FROM_NAME` | Optionnel | Nom expéditeur, défaut `Hello World` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Optionnel | Identifiants et callback OAuth Google |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` | Optionnel | Identifiants et callback OAuth GitHub |

Voir [.env.example](./.env.example) pour le gabarit sans secret.
Génère la même valeur pour `FRONTEND_API_KEY` et `VITE_API_KEY` avec
`node -p "require('node:crypto').randomBytes(32).toString('hex')"`. La clé est
intégrée au code du navigateur : elle peut identifier l'application mais n'est
pas un secret. La limitation de débit est appliquée côté API à 100 requêtes par
minute et par IP ; derrière Nginx, le serveur utilise l'IP transmise par le
proxy de confiance.
En développement, l'URI de redirection Google à déclarer dans Google Cloud
est `http://localhost:3000/api/v1/auth/google/callback`. Après OAuth, l'API
redirige vers le frontend (`CORS_ORIGINS`) ; un nouveau compte complète ensuite
sa spécialité, son niveau et ses centres d'intérêt avant d'accéder au fil.
Les trois paramètres Cloudinary peuvent rester vides pendant le développement ;
les opérations médias répondent alors `503 MEDIA_PROVIDER_NOT_CONFIGURED`.
Ils doivent être définis ensemble pour activer le service.
`BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY` et `BREVO_FROM_EMAIL` sont requis ensemble
pour envoyer les OTP via `smtp-relay.brevo.com` (port 587). L'adresse expéditeur
doit être vérifiée dans Brevo.
Les inscriptions locales restent bloquées à l'étape de vérification tant que le
service d'e-mail n'est pas configuré. Chaque fournisseur OAuth est optionnel,
mais ses trois paramètres doivent être définis ensemble. L'OTP à 4 chiffres
est demandé lors de l'inscription locale et peut aussi servir à la connexion
par e-mail ; le code expire après 4 minutes. La connexion par mot de passe
reste disponible. Google et GitHub doivent retourner une adresse e-mail
vérifiée.
### E-mails transactionnels Brevo

Configurez les identifiants SMTP et un expéditeur vérifié dans Brevo, puis
renseignez les variables `BREVO_*` dans `.env`. Utilisez une clé SMTP, pas la
clé API. Le relais utilise `smtp-relay.brevo.com` sur le port 587.

En local, les erreurs d'envoi SMTP sont journalisées par l'API sans inclure
la clé, le code OTP ou l'adresse du destinataire. Le frontend affiche le code
métier et écrit les détails HTTP dans la console du navigateur en mode Vite
développement ; ces diagnostics ne sont pas activés dans un build de production.

## Scripts utiles

```powershell
npm run build
npm test
npm run test:e2e
npm run lint
```

## Hébergement Docker du monorepo

La configuration Compose et le Dockerfile du frontend sont à la racine et dans
`frontend/`. Depuis la racine, configure `backend/.env` puis démarre la stack :

```powershell
docker compose --env-file backend/.env up -d --build
```

Compose lance PostgreSQL, exécute les migrations, puis démarre l'API et le
frontend. L'application est accessible sur `http://localhost:8080` par défaut.
Pour un déploiement public, règle `APP_ORIGIN` sur l'URL publique et
`FRONTEND_PORT` sur le port exposé souhaité. Les mots de passe PostgreSQL sont
utilisés dans l'URL de connexion ; choisis une valeur longue composée de
caractères URL-safe.

En développement local (`NODE_ENV=development`), TypeORM synchronise le schéma
au démarrage. Cette option est désactivée en test et en production. En
production, applique les migrations avec `npm run migration:run` après avoir
configuré `.env` ; `npm run migration:revert` annule la migration la plus
récente. Ne combine pas la synchronisation automatique locale avec l'exécution
des migrations sur la même base, car les deux mécanismes peuvent modifier le
même schéma.

## Architecture et contrats

- [Conception et architecture](../docs/architecture.md)
- [Contrats HTTP et WebSocket](../docs/api-contracts.md)

Les profils exposent le handle unique (3 à 20 caractères), la spécialité, le
niveau d'expérience, la biographie, le lien GitHub, les centres d'intérêt et les
technologies maîtrisées via `PATCH /api/v1/users/me`. Les écrans web sont dans
le dossier frère `frontend/`.

Les commentaires et réponses sous les publications passent par HTTP. Le domaine de
messagerie (conversations, groupes et messages) passe exclusivement par
WebSocket/Socket.IO. La messagerie directe entre deux personnes utilise une
conversation de type `DIRECT`. L'OTP d'inscription via SMTP et la connexion
OAuth Google/GitHub sont implémentés ; les refresh tokens rotatifs,
projets/contributions, notifications, réactions, favoris et recherche restent à
développer. Les médias sont intégrés pour les photos de profil et les pièces
jointes image/vidéo des chats et publications. Les migrations doivent être
appliquées avec `npm run migration:run` avant d'utiliser les nouvelles tables.
