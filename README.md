# Hello World backend

Backend NestJS du réseau social Hello World destiné aux développeurs.

## Prérequis

- Node.js compatible avec le projet et npm
- PostgreSQL local ou une base Systalink Datacloud
- Une URL de connexion PostgreSQL
- Un secret JWT d'au moins 32 caractères aléatoires

## Installation et lancement (PowerShell)

```powershell
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

- `POST /api/v1/auth/register` envoie un code OTP de vérification par Brevo ;
  `POST /api/v1/auth/email/verify` confirme l'adresse et délivre le JWT ;
  `POST /api/v1/auth/email/resend` renvoie un code si nécessaire
- `POST /api/v1/auth/login` pour les comptes e-mail/mot de passe vérifiés
- `GET /api/v1/auth/google` et `/api/v1/auth/github` pour OAuth ; les callbacks
  renvoient le résultat d'authentification JSON
- `GET /api/v1/users/:username`, `GET/PATCH /api/v1/users/me`
- `GET/POST /api/v1/posts`, `GET/PATCH/DELETE /api/v1/posts/:postId`
- `GET/POST /api/v1/posts/:postId/comments` et modification/suppression HTTP
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
| `CORS_ORIGINS` | Non | Origines frontend séparées par des virgules |
| `CLOUDINARY_CLOUD_NAME` | Optionnel | Nom du compte Cloudinary |
| `CLOUDINARY_API_KEY` | Optionnel | Clé publique Cloudinary |
| `CLOUDINARY_API_SECRET` | Optionnel | Secret privé Cloudinary, serveur uniquement |
| `BREVO_SMTP_USER` | Optionnel | Identifiant SMTP Brevo |
| `BREVO_SMTP_KEY` | Optionnel | Clé SMTP Brevo (ne pas confondre avec une clé API) |
| `BREVO_SENDER_EMAIL` | Optionnel | Adresse expéditrice validée dans Brevo |
| `BREVO_SENDER_NAME` | Optionnel | Nom expéditeur, défaut `Hello World` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Optionnel | Identifiants et callback OAuth Google |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` | Optionnel | Identifiants et callback OAuth GitHub |

Voir [.env.example](./.env.example) pour le gabarit sans secret.
Les trois paramètres Cloudinary peuvent rester vides pendant le développement ;
les opérations médias répondent alors `503 MEDIA_PROVIDER_NOT_CONFIGURED`.
Ils doivent être définis ensemble pour activer le service.
Les paramètres SMTP Brevo sont requis ensemble pour envoyer les OTP ; les
inscriptions locales restent bloquées à l'étape de vérification tant que le
service d'e-mail n'est pas configuré. Chaque fournisseur OAuth est optionnel,
mais ses trois paramètres doivent être définis ensemble. L'OTP est demandé lors
de l'inscription locale, pas à chaque connexion. Google et GitHub doivent
retourner une adresse e-mail vérifiée.

## Scripts utiles

```powershell
npm run build
npm test
npm run test:e2e
npm run lint
```

Applique le schéma initial avec `npm run migration:run` après avoir configuré
`.env`. `npm run migration:revert` annule la migration la plus récente. Les
migrations seront la seule façon de faire évoluer le schéma ; la synchronisation
TypeORM est désactivée.

## Architecture et contrats

- [Conception et architecture](./docs/architecture.md)
- [Contrats HTTP et WebSocket](./docs/api-contracts.md)

Les commentaires sous les publications passent par HTTP. Le domaine de
messagerie (conversations, groupes et messages) passe exclusivement par
WebSocket/Socket.IO. La messagerie directe entre deux personnes utilise une
conversation de type `DIRECT`. L'OTP d'inscription via Brevo et la connexion
OAuth Google/GitHub sont implémentés ; les refresh tokens rotatifs,
projets/contributions, notifications, réactions, abonnements, favoris et
recherche restent à développer. Les médias sont intégrés pour les photos de
profil et les pièces jointes image/vidéo des chats.
