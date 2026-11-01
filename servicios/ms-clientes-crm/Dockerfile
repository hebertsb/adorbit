# syntax=docker/dockerfile:1
# Una sola imagen, tres procesos (se elige con el comando):
#   API:        (por defecto)
#   Relevo:     php artisan crm:publicar-bandeja
#   Consumidor: php artisan crm:consumir-comandos
FROM ghcr.io/mlocati/php-extension-installer:2.9 AS extensiones

FROM composer:2.8 AS dependencias
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --ignore-platform-reqs
COPY . .
RUN composer dump-autoload --no-dev --optimize --no-scripts

FROM php:8.5-cli-bookworm
COPY --from=extensiones /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions mongodb bcmath sockets \
    && rm /usr/local/bin/install-php-extensions \
    && useradd --system --uid 10001 --no-create-home crm
WORKDIR /app
COPY --from=dependencias --chown=crm:crm /app /app
RUN mkdir -p storage/framework/cache storage/framework/views storage/framework/sessions storage/logs bootstrap/cache \
    && chown -R crm:crm storage bootstrap/cache
USER crm
RUN php artisan package:discover --ansi
ENV APP_ENV=production APP_DEBUG=false LOG_CHANNEL=stderr CACHE_STORE=file SESSION_DRIVER=array
EXPOSE 8084
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD php -r "exit(@file_get_contents('http://127.0.0.1:8084/api/salud') === false ? 1 : 0);"
CMD ["php", "-S", "0.0.0.0:8084", "-t", "public"]
