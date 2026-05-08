# Keycloak Configuration

## Pre-configured Realm

The `realm-export.json` file contains a pre-configured Keycloak realm with:

- **Realm**: `myawesomeapp`
- **Client**: `myawesomeapp-frontend` (public client, implicit flow enabled)
- **Demo User**: username=`demo`, password=`demo`
- **Registration**: Enabled (users can create accounts via the Register button)

## Accessing Keycloak

- **Local dev**: http://localhost:8080 (admin console at http://localhost:8080/admin)
- **Admin credentials**: admin / admin
- **Kubernetes**: http://keycloak:8080 (internal)

## Endpoints Used by the App

- Login: `http://<keycloak-url>/realms/myawesomeapp/protocol/openid-connect/auth?client_id=myawesomeapp-frontend&redirect_uri=<frontend-url>/dashboard&response_type=token&scope=openid`
- Register: Same URL with `&kc_register=`
- Token validation: `http://<keycloak-url>/realms/myawesomeapp/protocol/openid-connect/userinfo`
- Health: `http://<keycloak-url>/health/ready`