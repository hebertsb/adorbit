# syntax=docker/dockerfile:1
FROM quay.io/keycloak/keycloak:24.0

USER root
RUN mkdir -p /opt/keycloak/data/import && chown -R 1000:0 /opt/keycloak/data/import
COPY --chown=1000:0 dominio.json.template /opt/keycloak/data/import/dominio.json.template
COPY --chown=1000:0 --chmod=0755 entrypoint.sh /opt/keycloak/entrypoint.sh
USER 1000

ENV KEYCLOAK_ADMIN=admin \
    KEYCLOAK_ADMIN_PASSWORD=admin \
    KC_HEALTH_ENABLED=true \
    KC_METRICS_ENABLED=true

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/entrypoint.sh"]

