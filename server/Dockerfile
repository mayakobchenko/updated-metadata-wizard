#build with context = repo root (so COPY package*.json finds the file
FROM node:22.14.0
WORKDIR /usr/src/app
# Copy package manifests from repo root (use build context = repo root)
COPY package*.json ./
RUN npm ci --only=production
COPY server ./server
WORKDIR /usr/src/app/server
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "index.js"]

