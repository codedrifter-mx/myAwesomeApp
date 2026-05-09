FROM quay.io/keycloak/keycloak:26.0

COPY realm-export.json /opt/keycloak/data/import/realm-export.json
COPY themes/ /opt/keycloak/themes/

ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_HOSTNAME_STRICT=false
ENV KC_HTTP_ENABLED=true
ENV KC_SPI_THEME_DEFAULT=myawesomeapp
ENV JAVA_OPTS="-Xms256m -Xmx384m"

ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start-dev", "--import-realm"]