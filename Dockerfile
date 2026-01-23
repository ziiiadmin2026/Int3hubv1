# Multi-stage build for Next.js frontend and Node.js backend
FROM node:20-slim AS base

# Install Python and build tools for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# ==========================================
# Stage 1: Build Frontend (Next.js)
# ==========================================
FROM base AS frontend-builder
WORKDIR /app

# Copy frontend package files
COPY package*.json ./
RUN npm install

# Copy frontend source and build
COPY pages ./pages
COPY components ./components
COPY styles ./styles
COPY public ./public
COPY next.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY .env.production ./

# Build Next.js app
RUN npm run build

# ==========================================
# Stage 2: Prepare Backend
# ==========================================
FROM base AS backend-builder
WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
RUN npm install --production

# Copy backend source
COPY backend/*.js ./

# ==========================================
# Stage 3: Production Runtime
# ==========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV BACKEND_PORT=4000

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy frontend artifacts
COPY --from=frontend-builder --chown=appuser:appuser /app/package*.json ./
COPY --from=frontend-builder --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=frontend-builder --chown=appuser:appuser /app/.next ./.next
COPY --from=frontend-builder --chown=appuser:appuser /app/public ./public
COPY --from=frontend-builder --chown=appuser:appuser /app/next.config.js ./

# Copy backend artifacts
COPY --from=backend-builder --chown=appuser:appuser /app/backend ./backend

# Create data directory for SQLite database
RUN mkdir -p /app/backend/data && chown -R appuser:appuser /app/backend/data

# Create startup script
COPY --chown=appuser:appuser <<EOF /app/start.sh
#!/bin/sh
set -e

# Start backend in background
cd /app/backend
PORT=${BACKEND_PORT:-4000} node ws-server.js &
BACKEND_PID=\$!

# Start frontend
cd /app
PORT=${PORT:-3000} npm run start &
FRONTEND_PID=\$!

# Wait for both processes
wait \$BACKEND_PID
wait \$FRONTEND_PID
EOF

RUN chmod +x /app/start.sh

# Switch to non-root user
USER appuser

# Expose ports
EXPOSE 3000 4000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run startup script
CMD ["/app/start.sh"]
