# Hello World

Projet composé d'une API NestJS et d'une application web React :

- [`backend/`](./backend/) — API NestJS, accès PostgreSQL, migrations et tests.
- [`frontend/`](./frontend/) — application React/Vite.
- [`docs/`](./docs/) — architecture et contrats partagés.

Le dépôt Git reste à la racine (`.git/`).

## Démarrage rapide

Dans un terminal, lance l'API :

```powershell
Set-Location backend
npm install
Copy-Item .env.example .env
npm run dev
```

Renseigne les variables nécessaires dans `backend/.env` avant le démarrage.
Dans un deuxième terminal, lance l'application web :

```powershell
Set-Location frontend
npm install
npm run dev
```

Consulte les guides détaillés dans [backend/README.md](./backend/README.md) et
[frontend/README.md](./frontend/README.md).

## Lancer toute la stack avec Docker

Installe Docker Desktop, puis prépare le fichier d'environnement du backend si
ce n'est pas déjà fait :

```powershell
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
```

Dans `backend/.env`, remplace le secret JWT d'exemple et définis
`POSTGRES_PASSWORD` avec un mot de passe long composé de caractères URL-safe
(lettres, chiffres, `_` ou `-`). Pour un hébergement public, règle aussi
`APP_ORIGIN` sur l'URL publique du frontend.

Remplace également `FRONTEND_API_KEY` par une clé aléatoire de 32 octets ;
Compose transmet cette valeur au build du frontend comme `VITE_API_KEY`.

Pour lancer le frontend localement avec `npm run dev`, définis la même clé dans
`frontend/.env` sous `VITE_API_KEY`. Génère-la avec
`node -p "require('node:crypto').randomBytes(32).toString('hex')"`. La clé est
publique une fois intégrée au navigateur ; la limitation de débit par IP est la
protection effective contre un client trop bavard.

Depuis la racine du dépôt, lance les services :

```powershell
docker compose --env-file backend/.env up -d --build
```

Ouvre ensuite `http://localhost:8080`. Compose démarre PostgreSQL, applique les
migrations, lance l'API et sert le frontend via Nginx. La base utilise un volume
Docker persistant. Les commandes détaillées sont dans les README du backend et
du frontend.
