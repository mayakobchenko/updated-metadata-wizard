# docker build -f client/Dockerfile -t <image>
# In GitHub Actions: docker/build-push-action context to . and file to client/Dockerfile

FROM node:18 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .

# Vite build will produce /app/dist
RUN npm run build

# Production stage: serve static files with nginx
FROM nginx:stable-alpine
# Replace the default nginx config with the one from repo
RUN rm /etc/nginx/conf.d/default.conf
COPY client/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy build output into nginx static folder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
