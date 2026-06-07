# syntax=docker/dockerfile:1

# ============================================================
# secure-messenger :: single-service image
# Builds shared + backend + frontend, then the backend serves the web client
# AND the API/WebSocket from one port (one public URL).
# ============================================================

# ---------- Build stage ----------
FROM node:20-bookworm AS build
WORKDIR /app

# Copy the whole monorepo and install all workspace deps (incl. dev deps,
# needed for tsc + vite). .dockerignore keeps node_modules/dist out.
COPY . .
RUN npm install

# Web client talks to the SAME origin it is served from (empty base URL).
ENV VITE_BACKEND_URL=""
RUN npm run build

# Place the web build where the backend serves it, and ship schema.sql next to
# the compiled code so auto-migration can find it.
RUN mkdir -p packages/backend/public packages/backend/dist/database \
 && cp -r packages/frontend/dist/* packages/backend/public/ \
 && cp packages/backend/src/database/schema.sql packages/backend/dist/database/schema.sql

# ---------- Runtime stage ----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Reuse installed modules + built artifacts from the build stage.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/backend/package.json ./packages/backend/package.json
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/backend/public ./packages/backend/public

# Railway/Render inject PORT; the app reads process.env.PORT (defaults to 3001).
EXPOSE 3001
CMD ["node", "packages/backend/dist/main.js"]
