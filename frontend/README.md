# Hello World, frontend

Application web React (Vite + TypeScript) du réseau social Hello World. Elle est
conçue mobile first d'après les maquettes Figma et branchée sur l'API NestJS du
dossier parent.

## Lancer en local

Le back doit tourner sur `http://localhost:3000` (voir le README racine).

```powershell
cd frontend
npm install
Copy-Item .env.example .env   # facultatif, l'URL par défaut est http://localhost:3000
npm run dev                   # http://localhost:3001
```

Le port 3001 est celui attendu par `CORS_ORIGINS` dans le `.env` du back. Il est
aussi vérifié par la gateway Socket.IO.

## Organisation

| Fichier | Rôle |
|---|---|
| `src/api.ts` | Client HTTP typé sur les DTO publics du back, messages d'erreur lisibles par code métier |
| `src/socket.ts` | Connexion Socket.IO `/messaging` (JWT dans `auth.token`) et `emit` avec accusé de réception |
| `src/auth.tsx` | Session : jeton, utilisateur courant, déconnexion sur 401 |
| `src/ui.tsx` | Composants partagés : icônes, avatar, carte de publication, fil paginé, états vide/erreur/chargement |
| `src/styles.css` | Tokens de la charte `Style.md` (thème sombre) et composants |
| `src/pages/*` | Écrans : authentification, social, profil, projets, messagerie |

## Écrans

Accueil, connexion (mot de passe ou code OTP), inscription en 5 étapes, fil
« Pour vous » / « Abonnements », Explorer, discussion (réponses, votes utiles,
suivi de question), publication (publication, question, projet, brouillons,
pièces jointes), profil, modification du profil, paramètres, projets (découvrir,
mes projets, création), fiche projet, tâche, messagerie temps réel (liste,
conversation, création de groupe), notifications et sauvegardes.

Notifications, sauvegardes, discussions de projet et la plupart des préférences
n'ont pas encore d'API. Leurs écrans affichent un état vide qui le dit, sans
fausses données.

## Ordre de l'inscription

`POST /auth/register` exige l'e-mail, le pseudo, le nom et le mot de passe avant
d'envoyer l'OTP. L'inscription suit donc l'ordre Compte → Identifiants →
Vérification → Profil → Intérêts, alors que la maquette place la vérification en
2e position.
