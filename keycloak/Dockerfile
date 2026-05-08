FROM quay.io/keycloak/keycloak:26.0

COPY realm-export.json /opt/keycloak/data/import/realm-export.json

ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_HOSTNAME_STRICT=false
ENV KC_HTTP_ENABLED=true

ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start-dev", "--import-realm"]