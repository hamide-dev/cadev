# Hello World — conception du backend

## 1. Périmètre fonctionnel

Hello World est un réseau social destiné aux développeurs. La première version
doit couvrir :

- les comptes, l'authentification et les profils développeurs ;
- les publications (article, question technique, lancement de projet), leur fil
  d'actualité, leurs tags et leurs pièces jointes ;
- les commentaires et réponses sous une publication ;
- les réactions, abonnements, favoris et notifications ;
- les projets open source, leurs membres, tâches et propositions de contribution ;
- les conversations directes, les groupes de discussion et les salons de projet ;
- la recherche et les aperçus de dépôts GitHub publics.

Les communautés avec fil de publications et adhésion indépendante ne sont pas
dans le périmètre confirmé. « Groupes » désigne ici les groupes de discussion
de la messagerie.

## 2. Décisions structurantes

1. **Les commentaires de publication sont des opérations HTTP REST.** Leur
   création, lecture, modification et suppression ne passent pas par Socket.IO
   et ne déclenchent pas d'événement de commentaire en temps réel.
2. **Toute la messagerie passe par Socket.IO**, y compris la création et la
   consultation des conversations, l'historique, les groupes, les messages,
   les réponses, les pièces jointes déjà téléversées, les accusés de lecture,
   la présence et la saisie. L'API HTTP ne fournit pas de routes de messagerie.
3. **PostgreSQL est la source de vérité.** Les services applicatifs valident les
   droits et les invariants ; les messages et notifications sont persistés
   avant d'être émis. Une déconnexion ne fait donc pas perdre les événements
   persistants.
4. **Les contrats publics sont des DTO construits par liste blanche.** Aucune
   entité TypeORM n'est renvoyée directement.
5. **Le fil “Abonnements” est chronologique.** Le fil “Pour vous” commence par
   une sélection explicable fondée sur les intérêts et compétences, sans
   prétendre être un moteur de recommandation avancé.
6. **Les groupes de messagerie sont privés.** Un membre ne peut lire ou écrire
   que dans une conversation dont il est membre. Les salons de projet sont
   soumis en plus aux droits du projet.
7. **Les publications sont publiques par défaut** pour soutenir la découverte
    et le fil social ; les règles de visibilité de profil restent à définir.

## 3. Acteurs et règles métier principales

| Acteur | Capacités |
|---|---|
| Visiteur | Consulter les contenus explicitement publics et les aperçus publics autorisés. |
| Membre authentifié | Gérer son profil, publier, commenter, réagir, suivre et sauvegarder. |
| Membre d'un projet | Consulter les tâches et participer selon son rôle. |
| Membre d'une conversation | Lire son historique et échanger dans cette conversation. |
| Créateur / mainteneur | Gérer le projet selon son rôle ; dans un groupe, gérer les membres si autorisé. |

Invariants à faire respecter côté serveur :

- un utilisateur ne peut pas se suivre lui-même ;
- un commentaire appartient à une publication ; une réponse appartient au même
  fil de commentaires ;
- une réaction, un favori et un abonnement sont uniques pour leur paire
  d'identifiants métier ;
- une conversation directe ne contient que deux membres et ne doit pas être
  créée en doublon pour la même paire ;
- un message parent appartient à la même conversation que sa réponse ;
- l'émetteur d'un message doit être membre actif de la conversation ;
- les opérations de rôle et d'adhésion à un projet sont vérifiées par le service
  applicatif, pas seulement par l'interface ;
- une notification est enregistrée avant toute tentative de diffusion temps réel.

## 4. Architecture en couches

```text
HTTP controllers / Socket.IO gateways
                  |
                  v
          Services applicatifs
                  |
          Domaines et contrats
                  |
          Interfaces de dépôts
                  |
      Implémentations TypeORM
                  |
              PostgreSQL

Services applicatifs --> ports d'infrastructure --> Mail / Cloudinary / GitHub
Notifications persistées --> diffuseur temps réel --> Socket.IO
```

- **Présentation** : contrôleurs HTTP, gateway Socket.IO, DTO entrants,
  guards, validation, documentation et mappers de réponse. Aucun accès direct
  à TypeORM ou à un SDK externe.
- **Application** : orchestration des cas d'utilisation, règles d'autorisation,
  transactions et émission d'événements après persistance.
- **Domaine** : types, énumérations et invariants métier, indépendants de NestJS,
  TypeORM et Socket.IO.
- **Persistance** : dépôts TypeORM encapsulant requêtes, index et chargements.
- **Infrastructure** : PostgreSQL, services mail, Cloudinary, clients OAuth et
  GitHub, adaptateurs Socket.IO.
- **Contrats de sortie** : DTO publics et mappers qui ne sélectionnent que les
  champs exposables.

Les contrôleurs HTTP et la gateway dépendent des services applicatifs. Les
services applicatifs dépendent de contrats de dépôts et de ports externes,
fournis par les modules d'infrastructure via l'injection NestJS.

## 5. Modules NestJS et frontières

| Module | Responsabilité et dépendances principales |
|---|---|
| `auth` | Inscription, OTP, connexion, sessions, JWT et OAuth ; dépend de `users`, `mail` et des dépôts d'authentification. |
| `users` | Compte, profil développeur, compétences et intérêts ; fournit les profils publics aux autres modules. |
| `posts` | Publications, fils d'actualité, tags et règles de visibilité ; dépend de `users` et `media`. |
| `comments` | Commentaires/réponses sous publication par HTTP ; dépend de `posts`, `users` et `notifications`. |
| `reactions` | Réactions aux contenus ; dépend des contenus ciblés, `users` et `notifications`. |
| `follows` | Abonnements entre utilisateurs et flux des abonnements ; dépend de `users` et `notifications`. |
| `bookmarks` | Favoris privés d'un utilisateur ; dépend des contenus publiables. |
| `projects` | Projets, membres, tâches et contributions ; dépend de `users`, `media` et `notifications`. |
| `messaging` | Conversations directes/groupes/projet, messages et unique gateway Socket.IO ; dépend de `users`, `projects`, `media` et `notifications`. |
| `notifications` | Persistance, pagination, lecture et port de diffusion ; ne contient pas la logique de messagerie. |
| `media` | Téléversement Cloudinary, contrôles de type/taille et accès temporaire aux ressources privées. |
| `github-preview` | Extraction stricte d'URL GitHub, client GitHub et cache ; ne récupère jamais une URL arbitraire. |
| `search` | Recherche filtrée des profils, publications, projets et tâches. |
| `mail` | Envoi des OTP et courriels transactionnels via un port injectable. |
| `database` | Configuration PostgreSQL, entités, migrations et transactions TypeORM. |
| `common` | Types et mécanismes réellement partagés : pagination, erreurs, corrélation, guards. |

Les dépendances entre domaines sont limitées à leurs contrats publics. Les
notifications sont appelées par les cas d'utilisation concernés ; leur gateway
de diffusion ne réimplémente aucune règle métier.

## 6. Arborescence cible

```text
src/
  app.module.ts
  main.ts
  common/
    auth/
    errors/
    pagination/
    observability/
  config/
  database/
    migrations/
    database.module.ts
  modules/
    auth/
      application/ domain/ infrastructure/ presentation/
    users/
      application/ domain/ infrastructure/ presentation/
    posts/
      application/ domain/ infrastructure/ presentation/
    comments/
      application/ domain/ infrastructure/ presentation/
    reactions/
    follows/
    bookmarks/
    projects/
    messaging/
      application/ domain/ infrastructure/ presentation/
      presentation/events/
    notifications/
    media/
    github-preview/
    search/
    mail/
test/
docs/
```

Les dossiers internes sont créés lorsqu'ils contiennent des responsabilités
réelles ; la structure n'impose pas de fichiers vides. `messaging` regroupe
conversations et messages afin que le transport Socket.IO, les permissions et
les transactions de messagerie aient une frontière cohérente.

## 7. Modèle relationnel PostgreSQL proposé

Toutes les tables métier utilisent un UUID comme identifiant primaire et des
horodatages `createdAt` / `updatedAt` lorsque pertinents. Les noms ci-dessous
décrivent les tables et relations attendues ; les migrations définiront les
contraintes exactes.

| Tables | Relations et contraintes importantes |
|---|---|
| `users`, `developer_profiles` | Profil 1–1 avec `userId` unique ; e-mail et pseudo normalisés et uniques. |
| `user_credentials`, `oauth_accounts`, `sessions`, `email_otps` | Credential local facultatif ; fournisseur + identifiant fournisseur uniques ; secrets/hashes jamais sélectionnés dans les DTO publics ; OTP à durée de vie limitée et usage unique. |
| `interests`, `user_interests` | N–N avec contrainte unique `(userId, interestId)`. |
| `posts`, `post_tags`, `tags`, `post_attachments` | Auteur obligatoire ; type de publication enum ; index `(createdAt, id)` et auteur/date pour les fils. |
| `comments` | Publication obligatoire ; auteur obligatoire ; `parentCommentId` nullable ; index `(postId, createdAt, id)` ; validation applicative que parent et enfant appartiennent à la même publication. |
| `reactions`, `follows`, `bookmarks` | Unicité par utilisateur et cible ; contrainte anti-auto-abonnement. |
| `projects`, `project_members`, `project_tasks`, `task_contributions` | Rôles et statuts enum ; membres uniques par projet ; index pour tâches par projet/statut. |
| `conversations`, `conversation_members` | Type `DIRECT`, `GROUP` ou `PROJECT` ; membres uniques ; les droits d'accès sont vérifiés à chaque opération. |
| `messages`, `message_attachments`, `message_receipts` | Message appartient à une conversation et à un membre expéditeur ; `parentMessageId` autoréférentiel avec `SET NULL` ; contrôle applicatif du parent dans la même conversation ; index `(conversationId, createdAt, id)`. |
| `notifications` | Destinataire obligatoire ; type et statut de lecture ; index `(recipientId, readAt, createdAt)` ; données de cible minimales. |
| `media_assets` | Métadonnées et identifiant fournisseur, jamais de secret Cloudinary ; accès privé via URL temporaire/autorisée. |

Les suppressions de compte/contenu doivent préserver les historiques utiles :
les choix `CASCADE`, `RESTRICT` et `SET NULL` sont explicites dans les
migrations. `synchronize` est désactivé ; le schéma évolue uniquement par
migrations versionnées.

## 8. Types métier initiaux

- `PostType`: `ARTICLE`, `QUESTION`, `PROJECT_LAUNCH`
- `ConversationType`: `DIRECT`, `GROUP`, `PROJECT`
- `MessageType`: `TEXT`, `CODE`, `LINK`, `MEDIA`, `VOICE_NOTE`, `ISSUE_REFERENCE`
- `ProjectRole`: `OWNER`, `MAINTAINER`, `CONTRIBUTOR`
- `TaskStatus`: `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CLOSED`
- `NotificationType`: `REPLY`, `MENTION`, `NEW_FOLLOWER`, `REACTION`,
  `PROJECT_UPDATE`, `TASK_UPDATE`, `CONTRIBUTION`

Les tags, compétences et intérêts restent des données extensibles en base,
pas des enums compilés. Les enums seront confirmés avec le modèle final avant
les migrations.

## 9. Risques et contrôles à intégrer

- **Accès horizontal non autorisé** : contrôle d'appartenance/propriété dans
  chaque cas d'utilisation HTTP et WebSocket, avec tests négatifs.
- **Exposition de secrets** : DTO de réponse par liste blanche ; tests vérifiant
  l'absence de hashes, OTP et jetons.
- **WebSocket non authentifié ou usurpé** : JWT vérifié à la connexion, DTO
  validés par événement, autorisation serveur pour chaque conversation.
- **Réponses de message incohérentes** : vérification transactionnelle de
  l'appartenance du parent à la conversation.
- **SSRF via aperçu GitHub** : seules les URL `github.com/{owner}/{repo}` sont
  acceptées ; appels vers API GitHub fixe, sans fetch d'URL arbitraire.
- **Téléversements abusifs** : taille et MIME contrôlés, clés Cloudinary côté
  serveur, droits vérifiés pour les ressources privées.
- **Doublons et courses concurrentes** : contraintes uniques en base et
  transactions/idempotence là où une action peut être répétée.
- **Coûts de lecture** : curseurs pour flux et historique, limites validées,
  tris par liste blanche, index correspondant aux requêtes.

## 10. Décisions restant à valider avant les modules concernés

Ces choix n'empêchent pas de figer les frontières de la phase 1, mais devront
être renseignés avant la configuration des intégrations ou la finalisation des
règles :

1. Fournisseur SMTP/e-mail, clés et URL de callback OAuth de déploiement.
2. Possibilité d'inviter des non-membres dans un groupe et règles de sortie /
   suppression d'un membre.
3. Taille maximale et types de pièces jointes, durée de rétention et politique
   de suppression de compte.
4. Exigences de visibilité des profils (public, abonnés, privé) et éventuelle
   possibilité de rendre une publication non publique.
5. Filtres et ordre exacts du fil « Pour vous » pour la première version.

Les secrets et URL de production ne doivent pas être inventés ni committés ;
ils seront fournis via une configuration d'environnement validée au démarrage.

## 11. Plan de réalisation priorisé

1. **Fondations** : configuration validée, ValidationPipe strict, PostgreSQL,
   migrations, erreurs uniformes, Swagger, santé et logs sans secrets.
2. **Identité** : utilisateurs/profils, inscription, vérification e-mail,
   sessions/JWT, révocation et tests d'exclusion des données sensibles.
3. **Réseau social** : publications, fil chronologique des abonnements,
   commentaires HTTP, réponses, réactions, abonnements, favoris et notifications.
4. **Projets** : projets, rôles de membres, tâches et contributions avec
   contrôles d'autorisation.
5. **Messagerie Socket.IO** : conversations/groupes, historique, messages,
   réponses, pièces jointes, lectures et permissions ; aucun endpoint HTTP de
   messagerie.
6. **Intégrations et recherche** : Cloudinary, OAuth, e-mail, aperçu GitHub
   contraint et recherche.
7. **Finalisation** : tests d'intégration sur base dédiée, vérification des
   migrations/performance, contrats frontend complets et documentation de
   déploiement.

Chaque étape doit inclure tests ciblés et mise à jour des contrats avant de
passer à la suivante.
