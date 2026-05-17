# Sealed Secrets

This directory contains Kubernetes secrets encrypted with [sealed-secrets](https://github.com/bitnami-labs/sealed-secrets). The Sealed Secrets controller runs in the cluster and decrypts these at deployment time.

## How to Update Secrets

1. Install kubeseal CLI: https://github.com/bitnami-labs/sealed-secrets#installation
2. Create a temporary secret manifest:
   ```bash
   kubectl create secret generic demo-app-secrets \
     --namespace demo-app \
     --from-literal=keycloak-admin-password=hackathon-demo-keycloak-admin \
     --from-literal=postgres-password=hackathon-demo-postgres-password \
     --dry-run=client -o yaml > tmp-secret.yaml
   ```
3. Seal it:
   ```bash
   kubeseal --format yaml < tmp-secret.yaml > sealed-demo-app-secrets.yaml
   ```
4. Clean up the temporary file:
   ```bash
   rm tmp-secret.yaml
   ```
5. Commit `sealed-demo-app-secrets.yaml` — it is safe to commit because the values are encrypted.

## Prerequisites

The Sealed Secrets controller must be installed in the cluster:
```bash
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.26.0/controller.yaml
```
