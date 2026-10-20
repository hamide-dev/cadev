# Hello World — contrats frontend/backend

Ce document décrit les frontières de transport. Les routes et événements
marqués ci-dessous comme disponibles sont implémentés ; les autres décrivent le
périmètre cible et ne doivent pas être considérés comme déjà opérationnels.
Les réponses exposent uniquement les champs explicitement autorisés.

## Première tranche disponible

| Transport | Routes / événements |
|---|---|
| HTTP | `POST /api/v1/auth/register`, `POST /api/v1/auth/email/verify`, `POST /api/v1/auth/email/resend`, `POST /api/v1/auth/login`, `POST /api/v1/auth/login/code`, `POST /api/v1/auth/login/verify` |
| HTTP / OAuth | `GET /api/v1/auth/google`, `GET /api/v1/auth/google/callback`, `GET /api/v1/auth/github`, `GET /api/v1/auth/github/callback` |
| HTTP | `GET /api/v1/users/:username`, `GET/PATCH /api/v1/users/me`, `PUT/DELETE /api/v1/users/:username/follow` |
| HTTP | Publications et flux : `GET/POST /api/v1/posts`, `/posts/feed/following`, `/posts/feed/for-you`, `/posts/users/:username`, brouillons, likes et épinglage |
| HTTP | Médias de publication : `POST /api/v1/media/posts/signature`, `POST /api/v1/media/posts/confirm` |
| HTTP | `GET/POST /api/v1/posts/:postId/comments`, `PATCH/DELETE /api/v1/posts/comments/:commentId` |
| HTTP | Questions : `GET/POST /api/v1/posts/:postId/answers`, vote utile et suivi de question |
| HTTP | Aperçu GitHub public : `GET /api/v1/github-preview?url=...` |
| Socket.IO `/messaging` | `conversation:create`, `conversation:list`, `conversation:join`, `conversation:leave`, `message:history`, `message:send`, `typing:start`, `typing:stop` |

La tranche disponible persiste les comptes locaux et leurs vérifications
d'adresse e-mail, profils de développeur, abonnements, posts et médias,
commentaires/réponses, votes utiles, suivi de questions et conversations directes/groupes avec messages de texte,
code, lien ou pièce jointe. Les posts prennent en charge les brouillons, likes,
mentions, épinglage et flux paginés. Les inscriptions locales envoient un OTP
à 4 chiffres via Brevo ; OAuth Google/GitHub accepte uniquement des adresses
vérifiées par le fournisseur.

Non encore livrés : refresh tokens rotatifs et révocables,
projets/tâches/contributions, salons projet, notifications, favoris,
réactions autres que les likes, accusés de lecture, notes vocales et recherche.

## Principes de transport

- Les opérations de profil, publications, fil, commentaires, réactions,
  abonnements, favoris, projets, recherche et notifications utilisent HTTP
  JSON.
- **Les commentaires sous une publication sont exclusivement HTTP** ; aucune
  création/lecture de commentaire ne passe par Socket.IO.
- **Tout le domaine de messagerie utilise Socket.IO** : conversations, création
  de groupes, adhésions, historique, messages et événements de présence/lecture.
  Aucune route HTTP de messagerie n'est exposée.
- Le JWT d'application authentifie HTTP et Socket.IO. Les tokens OAuth du
  fournisseur ne sont jamais envoyés au client.
- Les erreurs HTTP et les erreurs Socket.IO utilisent les formes normalisées
  décrites ci-dessous.

## Enveloppes communes

Réponse de liste :

```json
{
  "items": [],
  "nextCursor": "opaque-ou-null",
  "hasMore": false
}
```

Erreur HTTP :

```json
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "La requête est invalide.",
  "details": []
}
```

Erreur d'événement :

```json
{
  "event": "message:send",
  "requestId": "uuid",
  "error": {
    "code": "FORBIDDEN",
    "message": "Action non autorisée."
  }
}
```

Ne jamais inclure les traces, SQL, jetons, hashes, OTP ou secrets dans les
erreurs. `details` contient uniquement des erreurs de validation non sensibles.

## Contrats HTTP

Les routes décrites ci-dessous sont préfixées par `/api/v1` et soumises à validation stricte (`whitelist`,
`forbidNonWhitelisted`, transformation sans conversion implicite) et aux guards
requis. Les opérations authentifiées reçoivent l'identité depuis le JWT, jamais
depuis un champ `userId` fourni par le client.

| Méthode et chemin | Auth. | Entrée / sortie principale | Règles notables |
|---|---|---|---|
| `POST /auth/register` | Non | `email`, `username`, `displayName`, `password` → statut d'envoi OTP | Disponible ; aucun token avant vérification ; code à 4 chiffres valable 10 min, 5 tentatives maximum. |
| `POST /auth/email/verify` | Non | `email`, `code` → access JWT + utilisateur public | Disponible ; valide l'adresse et consomme le code. |
| `POST /auth/email/resend` | Non | `email` → statut générique d'envoi | Disponible ; limite de débit, ne révèle pas si un compte existe. |
| `POST /auth/login` | Non | e-mail + mot de passe → access JWT + utilisateur public | Disponible ; réservé aux comptes vérifiés ; limitation de débit. |
| `POST /auth/login/code`, `POST /auth/login/verify` | Non | e-mail puis code à 4 chiffres → access JWT + utilisateur public | Disponible ; OTP à durée limitée et à usage unique ; réponse d'envoi générique. |
| `GET /auth/google`, `GET /auth/google/callback` | OAuth | Redirection fournisseur puis access JWT + utilisateur public JSON | Disponible si les identifiants OAuth sont configurés ; e-mail Google vérifié requis. |
| `GET /auth/github`, `GET /auth/github/callback` | OAuth | Redirection fournisseur puis access JWT + utilisateur public JSON | Disponible si les identifiants OAuth sont configurés ; e-mail principal GitHub vérifié requis. |
| `POST /auth/refresh`, `POST /auth/logout` | Session | refresh/révocation → résultat | Prévu, non disponible. |
| `GET /users/:username`, `GET/PATCH /users/me` | Lecture publique / authentifié | profil public / champs modifiables → profil public | Disponible ; profil développeur avec handle, spécialité, niveau, intérêts, technologies et URL GitHub ; champs sensibles exclus. |
| `PUT/DELETE /users/:username/follow` | Authentifié | handle → état d'abonnement | Disponible ; pas d'auto-abonnement ; idempotent. |
| `GET /posts`, `GET /posts/users/:username` | Public | curseur opaque, limite → `{ items, nextCursor, hasMore }` | Disponible ; ordre chronologique stable `(createdAt, id)`, brouillons exclus. |
| `GET /posts/feed/following`, `GET /posts/feed/for-you` | Authentifié | curseur opaque, limite → page | Disponible ; flux chronologique des abonnements et sélection taguée par intérêts/technologies. |
| `POST /posts`, `POST /posts/drafts`, `GET /posts/drafts/me`, `POST /posts/:postId/publish` | Authentifié | DTO publication → post/page | Disponible ; brouillons privés à leur auteur ; contenu requis avant publication. |
| `GET /posts/:postId`, `PATCH /posts/:postId`, `DELETE /posts/:postId` | Auth. selon opération | DTO de publication → DTO public | Disponible ; auteur/propriétaire vérifié ; type `PostType`. |
| `PUT/DELETE /posts/:postId/like`, `PUT/DELETE /posts/:postId/pin` | Authentifié | aucun corps → état | Disponible ; likes idempotents ; un post épinglé par auteur. |
| `POST /media/posts/signature`, `POST /media/posts/confirm` | Authentifié | type média / public ID Cloudinary → média confirmé | Disponible ; uploads image/vidéo vérifiés ; pièces jointes limitées à cinq et attachables une fois. |
| `GET /posts/:postId/comments` | Public | commentaires → liste | Disponible en HTTP. |
| `POST /posts/:postId/comments` | Authentifié | `content`, `parentCommentId?` → commentaire public | Disponible en **HTTP seulement** ; parent doit appartenir au même post. |
| `GET /posts/:postId/answers` | Public | `sort?=useful\|chronological`, `limit?` → réponses | Disponible ; la publication doit être une question ; tri utile par votes. |
| `POST /posts/:postId/answers` | Authentifié | `content`, `parentCommentId?` → réponse publique | Disponible en HTTP ; uniquement pour une question publiée. |
| `PUT/DELETE /posts/comments/:commentId/useful` | Authentifié | aucun corps → `{ useful: boolean }` | Disponible ; vote idempotent, uniquement sur une réponse à une question. |
| `PUT/DELETE /posts/:postId/follow` | Authentifié | aucun corps → `{ following: boolean }` | Disponible ; suivi idempotent, uniquement sur une question publiée. |
| `PATCH /posts/comments/:commentId`, `DELETE /posts/comments/:commentId` | Authentifié | champs modifiables → résultat | Disponible ; auteur vérifié. |
| `PUT /posts/:postId/reactions/:type`, `DELETE /posts/:postId/reactions/:type` | Authentifié | aucun corps ou type enum → résultat | Idempotent ; une réaction par utilisateur et post. |
| `PUT /users/:userId/follow`, `DELETE /users/:userId/follow` | Authentifié | résultat | Pas d'auto-abonnement ; idempotent. |
| `PUT /posts/:postId/bookmark`, `DELETE /posts/:postId/bookmark` | Authentifié | résultat | Favori privé au propriétaire. |
| `POST /projects`, `GET /projects`, `GET /projects/:id`, `PATCH /projects/:id` | Auth. selon opération | filtres/DTO projet → DTO projet | Rôles Owner/Maintainer/Contributor. |
| `GET /projects/:id/tasks`, `POST /projects/:id/tasks` | Lecture publique ou membre / rôle autorisé | filtres/DTO tâche → page/tâche | Contrôles de droits par projet. |
| `POST /projects/:id/tasks/:taskId/contributions` | Authentifié | proposition → contribution | Unicité/idempotence à définir ; droits et tâche vérifiés. |
| `GET /notifications`, `GET /notifications/unread-count` | Authentifié | curseur / aucun corps → page/compteur | Uniquement les notifications du destinataire. |
| `PATCH /notifications/:id/read`, `POST /notifications/read` | Authentifié | id(s) → résultat | Contrôle destinataire ; lecture idempotente. |
| `GET /search` | Public ou authentifié | `q`, `type`, filtres, curseur → résultats | Liste blanche de types et filtres ; limites. |
| `GET /github-preview?url=...` | Public ou authentifié | URL GitHub → aperçu mis en cache | Disponible ; hôte et format strictement validés, TTL d'une heure et jamais de fetch libre. |
| `GET /health` | Selon déploiement | aucun → état minimal | Ne divulgue aucune configuration interne. |

Le serveur expose également `GET /api/v1/`, `GET /api/v1/health` et Swagger
sur `/api/docs`. Les routes non identifiées comme disponibles ci-dessus restent
à implémenter. La création/liste des conversations et l'historique des messages
sont absents de la table HTTP à dessein : leur contrat est exclusivement
WebSocket.

## Contrats Socket.IO de messagerie

Namespace : `/messaging`. Le client transmet le JWT d'application dans
`auth.token` à la connexion Socket.IO ; la gateway valide le jeton et l'origine
avant d'accepter la connexion. Les DTO des événements sont validés à réception.

| Événement entrant | Payload principal | Autorisation et résultat |
|---|---|---|
| `conversation:create` | `{ type: "DIRECT" \| "GROUP", memberIds, name? }` | Disponible ; créateur ajouté, direct = 2 membres, groupe = 2 à 30 membres. |
| `conversation:list` | Aucun | Disponible ; renvoie les conversations où l'émetteur est membre. |
| `conversation:join` | `{ conversationId }` | Disponible ; vérifie l'appartenance avant de joindre la room Socket.IO. |
| `conversation:leave` | `{ conversationId }` | Disponible ; quitte la room sans modifier l'adhésion persistante. |
| `conversation:members:update` | `{ conversationId, addMemberIds?, removeMemberIds? }` | Prévu, non disponible. |
| `message:history` | `{ conversationId, before?, limit? }` | Disponible ; vérifie l'appartenance et renvoie les messages triés. |
| `message:send` | `{ conversationId, type, content, parentMessageId? }` | Disponible ; vérifie membre et parent dans la même conversation, persiste avant émission. |
| `media:upload` | Payload binaire | Prévu, non disponible. |
| `message:read` | `{ conversationId, upToMessageId }` | Prévu, non disponible. |
| `typing:start`, `typing:stop` | `{ conversationId }` | Disponible ; vérifie l'appartenance avant diffusion éphémère. |

Événements serveur :

| Événement sortant | Destinataires | Données |
|---|---|---|
| `conversation:created` | Membres concernés connectés | DTO conversation et membres publics minimaux. |
| `conversation:updated` | Membres concernés | Prévu, non disponible. |
| `message:created` | Room de la conversation | DTO message et auteur public ; événement après persistance. |
| `media:uploaded` | Socket émettrice | Prévu, non disponible. |
| `message:read` | Membres concernés | Prévu, non disponible. |
| `typing:started`, `typing:stopped` | Autres membres de la conversation | Identifiant public de l'émetteur. |
| `notification:created` | Utilisateur connecté destinataire | Prévu, non disponible. |
| `exception` | Socket émettrice | Événement d'erreur NestJS pour les erreurs de validation et d'autorisation. |

Un message est confirmé uniquement après écriture en base. L'appartenance à la
room Socket.IO n'est jamais utilisée comme seule preuve d'autorisation. Les
réponses à un message utilisent `message:send` avec `parentMessageId` ;
elles ne passent pas par un endpoint HTTP.

### DTO de message public indicatif

```json
{
  "id": "uuid",
  "conversationId": "uuid",
  "sender": { "id": "uuid", "username": "dev", "displayName": "Dev" },
  "type": "TEXT",
  "content": "Salut",
  "parentMessageId": null,
  "createdAt": "2026-10-20T00:00:00.000Z"
}
```

À cette étape, `type` accepte `TEXT`, `CODE` ou `LINK`. Le DTO exclut
systématiquement mot de passe/hash, refresh/access tokens, OTP,
secrets de configuration et données privées d'autres membres.

## Pagination, validation et codes d'erreur

- Flux, commentaires et historique : curseur opaque et ordre stable `(createdAt,
  id)`, taille par défaut et maximale bornées par le serveur.
- Listes peu volumineuses : pagination par page si nécessaire.
- Les tris et filtres acceptés sont des listes blanches ; aucune expression SQL
  n'est fournie par le client.
- Les textes sont limités en taille ; les tableaux ont des tailles maximales ;
  les UUID, enums, URL et structures imbriquées sont validés dans des DTO
  dédiés.
- Codes d'erreur métier prévus : `VALIDATION_FAILED`, `UNAUTHENTICATED`,
  `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`,
  `DEPENDENCY_UNAVAILABLE`, `INTERNAL_ERROR`.

## Compatibilité et versionnement

Les routes HTTP sont sous `/api/v1`. Le namespace et les noms d'événements
WebSocket sont versionnés avec la même politique. Les changements incompatibles
nécessitent une nouvelle version de contrat et une mise à jour coordonnée du
frontend. Swagger documentera chaque route ; ce document reste la référence
complémentaire pour les événements Socket.IO.
