# 🐳 Docker Guide

Complete Docker setup for RoboSimLab — development, production, and multi-stage builds.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24.0
- [Docker Compose](https://docs.docker.com/compose/install/) ≥ 2.20 (optional)

---

## Development Setup

Run a hot-reloading dev server inside Docker:

### `Dockerfile.dev`

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Expose Vite dev server
EXPOSE 5173

# Start with host binding for Docker networking
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### Build & Run (Development)

```bash
docker build -f Dockerfile.dev -t robosimlab:dev .
docker run -p 5173:5173 -v $(pwd)/src:/app/src robosimlab:dev
```

> **Tip:** The volume mount (`-v`) enables live reload — edit files locally and see changes instantly.

---

## Production Setup

Optimized multi-stage build with Nginx serving the static bundle.

### `Dockerfile`

```dockerfile
# ---- Stage 1: Build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production=false

COPY . .
RUN npm run build

# ---- Stage 2: Serve ----
FROM nginx:1.25-alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Custom Nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Security: run as non-root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### `nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;
}
```

### Build & Run (Production)

```bash
docker build -t robosimlab:latest .
docker run -d -p 8080:80 --name robosimlab robosimlab:latest
```

Visit `http://localhost:8080`.

---

## Docker Compose

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  robosimlab:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/"]
      interval: 30s
      timeout: 3s
      retries: 3

  # Optional: development service
  robosimlab-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./src:/app/src
      - ./public:/app/public
    profiles:
      - dev
```

### Commands

```bash
# Production
docker compose up -d

# Development (with hot reload)
docker compose --profile dev up robosimlab-dev

# Rebuild after dependency changes
docker compose build --no-cache

# View logs
docker compose logs -f robosimlab

# Stop everything
docker compose down
```

---

## Image Size Optimization

The multi-stage build produces a minimal image:

| Stage | Base Image | Approx Size |
|-------|-----------|-------------|
| Build | `node:20-alpine` | ~400 MB (discarded) |
| Serve | `nginx:1.25-alpine` | ~25 MB + assets |

**Final image: ~30–40 MB** depending on asset size.

---

## Environment Variables

Pass build-time variables using Docker `--build-arg`:

```bash
docker build --build-arg VITE_API_URL=https://api.example.com -t robosimlab .
```

In `Dockerfile`, add before `RUN npm run build`:

```dockerfile
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
```

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `npm ci` fails in Docker | Ensure `package-lock.json` is committed and up to date |
| SPA routes return 404 | Verify `nginx.conf` has `try_files $uri $uri/ /index.html` |
| Container exits immediately | Check logs: `docker logs robosimlab` |
| Hot reload not working | Ensure volume mount points to `/app/src` |
