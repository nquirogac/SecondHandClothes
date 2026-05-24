FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build

FROM deps AS test-runner
WORKDIR /app
ENV NODE_ENV=test
COPY . .
CMD ["npm", "test", "--", "--runInBand"]

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
