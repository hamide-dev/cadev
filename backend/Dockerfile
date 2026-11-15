FROM node:24-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000
# Au démarrage : on applique d'abord les migrations en attente (celles déjà faites sont ignorées),
# puis on lance l'API. Aucun réglage à faire dans l'hébergeur.
CMD ["sh", "-c", "npm run migration:run:prod && exec node dist/main.js"]
