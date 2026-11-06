# syntax=docker/dockerfile:1
# Las variables VITE_* se "hornean" al construir: se pasan como --build-arg (ver README).
FROM node:22-alpine AS construccion
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
ARG VITE_OIDC_AUTORIDAD
ARG VITE_OIDC_CLIENTE_ID=portal-cliente
ARG VITE_API_FACTURACION_URL
ARG VITE_API_CRM_URL
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY seguridad.inc /etc/nginx/seguridad.inc
COPY --from=construccion /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/salud || exit 1
