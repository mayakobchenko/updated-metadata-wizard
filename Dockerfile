# Stage 1 — build frontend (all deps so we can build)
FROM node:22.14.0-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps --silent --no-audit --no-fund
COPY . .
RUN npm run build

# Stage 2 — install production dependencies only
FROM node:22.14.0-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production --legacy-peer-deps --silent --no-audit --no-fund

# Stage 3 — runtime
FROM node:22.14.0-alpine AS runtime
WORKDIR /usr/src/app

# ── install Python and pip ────────────────────────────────────────────────────
RUN apk add --no-cache python3 py3-pip

# ── install Python dependencies for the upload script ────────────────────────
COPY server/routes/python_scripts/requirements.txt ./python-requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -r ./python-requirements.txt

# ── copy app files ────────────────────────────────────────────────────────────
COPY server/ ./server
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./server/dist

WORKDIR /usr/src/app/server
ENV NODE_ENV=production
ENV PORT_SERVER=4000
EXPOSE 4000
CMD ["node", "index.js"]