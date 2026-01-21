# syntax = docker/dockerfile:1

# ============================================
# Stage 1: Build Admin App (React/Vite)
# ============================================
FROM node:20-alpine AS admin-builder

WORKDIR /app/admin-app

# Install pnpm
RUN npm install -g pnpm

# Copy admin-app package files
COPY admin-app/package.json admin-app/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy admin-app source
COPY admin-app/ ./

# Build admin app for production
RUN pnpm run build


# ============================================
# Stage 2: Build Backend (NestJS)
# ============================================
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev for building)
RUN pnpm install --frozen-lockfile

# Copy source code (exclude admin-app)
COPY . .
RUN rm -rf admin-app

# Build the application
RUN pnpm run build

# Remove dev dependencies
RUN pnpm prune --prod


# ============================================
# Stage 3: Production
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm for running scripts
RUN npm install -g pnpm

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built backend from builder
COPY --from=backend-builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=backend-builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=backend-builder --chown=nestjs:nodejs /app/package.json ./

# Copy built admin app to public/admin directory
COPY --from=admin-builder --chown=nestjs:nodejs /app/admin-app/dist ./public/admin

# Copy and setup entrypoint script
COPY --chown=nestjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Start the application with seed
CMD ["./docker-entrypoint.sh"]
