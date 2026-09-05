# Multi-stage Dockerfile for SBTS Frontend
# Stage 1: Build React SPA with Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Copy frontend package manifests for dependency layer caching
COPY frontend/package*.json ./frontend/

WORKDIR /app/frontend
RUN npm ci

# Copy frontend source and shared types
WORKDIR /app
COPY frontend ./frontend
COPY shared ./shared

# Build production bundle (default is normal mode, demo can be enabled via build-arg)
ARG VITE_DEMO_MODE=false
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE \
    VITE_API_URL=/api

WORKDIR /app/frontend
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine AS runner

# Remove default nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy built SPA files from builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
