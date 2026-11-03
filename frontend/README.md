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

Le code est rangé par fonctionnalité. Un écran vit avec ses sous-composants,
seul ce qui sert à plusieurs fonctionnalités remonte dans `components/` ou `lib/`.

```
src/
├── main.tsx              point d'entrée : routeur, session, styles
├── app/                  coque de l'application
│   ├── App.tsx           toutes les routes
│   ├── Shell.tsx         mise en page des écrans connectés (navigation, colonnes)
│   ├── Nav.tsx           barre du bas (mobile), rail (tablette), barre latérale (desktop)
│   └── Aside.tsx         colonne de suggestions sur grand écran
├── lib/                  logique sans interface
│   ├── api/              client HTTP (client.ts), types des DTO (types.ts),
│   │                     endpoints (endpoints.ts), envoi Cloudinary (cloudinary.ts)
│   ├── session.tsx       jeton, utilisateur courant, déconnexion sur 401
│   ├── socket.ts         Socket.IO /messaging et emit avec accusé de réception
│   ├── format.ts         libellés, dates relatives, messages d'erreur
│   └── useLoad.ts        chargement de données avec états
├── components/           briques d'interface partagées (Icon, Avatar, TopBar,
│                         Tabs, Sheet, RepoCard, états vide/erreur/chargement)
├── features/             un dossier par fonctionnalité
│   ├── auth/             accueil, connexion, inscription, mise en page en deux moitiés
│   ├── posts/            fil, carte de publication, discussion, rédaction
│   ├── explore/          recherche et découverte
│   ├── notifications/
│   ├── profile/          profil, modification, paramètres, sauvegardes
│   ├── projects/         liste, fiche projet, tâche, fenêtres de création
│   └── messages/         liste et conversation (deux volets sur desktop)
└── styles/               tokens.css → base.css → components.css → layout.css
```

Règle d'import : `features/` peut utiliser `components/` et `lib/`, jamais
l'inverse. Une fonctionnalité n'importe une autre que pour un composant
réellement partagé (par exemple `ProjectCard` dans le profil).

## Mise en page responsive

| Largeur | Mise en page |
|---|---|
| < 768 px | Une colonne, barre de navigation en bas sur les écrans principaux |
| ≥ 768 px | Rail d'icônes à gauche |
| ≥ 1024 px | Messagerie en deux volets, projets en grille, accueil en deux moitiés |
| ≥ 1200 px | Barre latérale complète, colonne centrale, colonne de suggestions |

Tout est dans `styles/layout.css`, écrit mobile first (`min-width` uniquement).

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
