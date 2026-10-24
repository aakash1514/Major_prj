# --- builder: install prod deps (toolchain present in case bcrypt must compile) ---
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- runtime: clean image, no build toolchain ---
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
# uploads/ is excluded from the build context; the static route still expects the dir.
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 5000
# 127.0.0.1, not localhost: busybox wget tries ::1 first and the server listens on IPv4 0.0.0.0 only.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1
CMD ["node", "index.js"]
