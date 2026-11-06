FROM node:20-alpine AS constructor

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS ejecutor

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=constructor /app/dist ./dist

ENV PORT=8000 \
    NODE_ENV=production

EXPOSE 8000

CMD ["node", "dist/servidor.js"]

