# syntax=docker/dockerfile:1
# Una sola imagen, tres procesos (se elige con el comando):
#   API (por defecto):  frankenphp run  (servidor de produccion con hilos, no el de desarrollo de PHP)
#   Relevo:             php artisan crm:publicar-bandeja
#   Consumidor:         php artisan crm:consumir-comandos
FROM composer:2.8 AS dependencias
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --ignore-platform-reqs
COPY . .
RUN composer dump-autoload --no-dev --optimize --no-scripts

FROM dunglas/frankenphp:1-php8.5-bookworm
RUN install-php-extensions mongodb bcmath sockets opcache \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && useradd --system --uid 10001 --create-home --home-dir /home/crm crm
WORKDIR /app
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=dependencias --chown=crm:crm /app /app
RUN mkdir -p storage/framework/cache storage/framework/views storage/framework/sessions storage/logs bootstrap/cache \
    && chown -R crm:crm storage bootstrap/cache
USER crm
RUN php artisan package:discover --ansi
ENV APP_ENV=production APP_DEBUG=false LOG_CHANNEL=stderr LOG_STDERR_FORMATTER=Monolog\\Formatter\\JsonFormatter \
    CACHE_STORE=file SESSION_DRIVER=array \
    XDG_CONFIG_HOME=/tmp/caddy-config XDG_DATA_HOME=/tmp/caddy-data
EXPOSE 8084
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD php -r "exit(@file_get_contents('http://127.0.0.1:8084/api/salud') === false ? 1 : 0);"
# El ENTRYPOINT de la imagen base se anula para poder correr tambien `php artisan ...` como comando.
ENTRYPOINT []
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
