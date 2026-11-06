FROM quay.io/keycloak/keycloak:24.0

COPY dominio.json /opt/keycloak/data/import/dominio.json

ENV KEYCLOAK_ADMIN=admin \
    KEYCLOAK_ADMIN_PASSWORD=admin \
    KC_HEALTH_ENABLED=true \
    KC_METRICS_ENABLED=true

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start-dev", "--import-realm"]

