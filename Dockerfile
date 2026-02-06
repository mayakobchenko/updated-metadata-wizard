# Stage 1 — build frontend (all deps so we can build)
FROM node:22.14.0-alpine AS build
WORKDIR /app

# Copy package.json and lockfile(s) for reproducible installs
COPY package*.json ./
# If you use pnpm or yarn, adjust accordingly to copy their lockfile(s)
RUN npm ci --silent --no-audit --no-fund

# Copy project files and build frontend (Vite default output is /dist)
COPY . .
RUN npm run build

# Stage 2 — install production dependencies only
FROM node:22.14.0-alpine AS prod-deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --production --silent --no-audit --no-fund

# Stage 3 — runtime: copy server, prod deps and built frontend
FROM node:22.14.0-alpine AS runtime
WORKDIR /usr/src/app

# Copy server code
COPY server/ ./server

# Copy production node_modules from prod-deps stage (installed at /app/node_modules)
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy built frontend into server/dist where vite-express expects it
# If your frontend build outputs to "build" instead of "dist" change the source accordingly.
COPY --from=build /app/dist ./server/dist

# If your server expects node_modules inside server/ (some setups do),
# uncomment the following line to move node_modules into server/node_modules:
# RUN mv ./node_modules ./server/node_modules

# Set working dir to server folder
WORKDIR /usr/src/app/server

ENV NODE_ENV=production
ENV PORT_SERVER=4000
EXPOSE 4000

# Start the server (make sure server/index.js binds to 0.0.0.0)
CMD ["node", "index.js"]
