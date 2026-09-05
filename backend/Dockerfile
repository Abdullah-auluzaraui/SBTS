# Multi-stage Dockerfile for SBTS Backend
# Stage 1: Build TypeScript source code
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications first for optimal Docker layer caching
COPY backend/package*.json ./backend/

WORKDIR /app/backend
RUN npm ci

# Copy backend source files and shared types
WORKDIR /app
COPY backend ./backend
COPY shared ./shared

# Compile TypeScript
WORKDIR /app/backend
RUN npm run build

# Stage 2: Minimal Production Runner
FROM node:20-alpine AS runner

# Install Chromium and Arabic fonts for Puppeteer PDF generation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-arabic

# Configure Puppeteer to use Alpine Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    PORT=5000

WORKDIR /app/backend

# Install production dependencies only
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/backend/dist ./dist

# Ensure node user owns the runtime directory
RUN chown -R node:node /app/backend

USER node

EXPOSE 5000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "dist/backend/src/server.js"]
