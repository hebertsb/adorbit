# syntax=docker/dockerfile:1
FROM quay.io/keycloak/keycloak:24.0

COPY dominio.json.template /opt/keycloak/data/import/dominio.json.template
COPY --chmod=0755 entrypoint.sh /opt/keycloak/entrypoint.sh

ENV KEYCLOAK_ADMIN=admin \
    KEYCLOAK_ADMIN_PASSWORD=admin \
    KC_HEALTH_ENABLED=true \
    KC_METRICS_ENABLED=true

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/entrypoint.sh"]

