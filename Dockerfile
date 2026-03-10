# # Stage 1: Dependency Installation
# FROM node:24-alpine AS deps
# WORKDIR /app
# COPY package.json package-lock.json ./
# RUN npm ci

# # Stage 2: Builder
# FROM node:24-alpine AS builder
# WORKDIR /app
# COPY --from=deps /app/node_modules ./node_modules
# COPY . .
# RUN npm run build

# # Stage 3: Runner (Minimal Production Image)
# FROM node:24-alpine AS runner
# WORKDIR /app
# ENV NODE_ENV production
# RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# # Copy essential build outputs
# COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# COPY --from=builder /app/public ./public

# USER nextjs
# EXPOSE 3000

# CMD ["node", "server.js"]

FROM node:24.13-alpine AS builder

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build



FROM node:24.13-alpine

WORKDIR /usr/src/app


COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# RUN npm ci --only=production

COPY --from=builder /app/dist ./dist


CMD ["npm", "run", "start:prod"]