# Hetzner Cloud Production Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy myAwesomeApp (Frontend + Keycloak + Health Monitor) to Hetzner Cloud CX32 instance with k3s + ArgoCD, self-signed TLS, and production-mode Keycloak with PostgreSQL.

**Architecture:** Single CX32 x86 instance (4 vCPU, 8GB RAM) running k3s. Traefik handles HTTPS with a self-signed cert (upgradeable to Let's Encrypt). Keycloak runs in production mode behind Traefik proxy, backed by PostgreSQL. ArgoCD manages GitOps deployment from the GitHub repo. GitHub Actions builds Docker images on push.

**Tech Stack:** Hetzner Cloud, Ubuntu 24.04, k3s, Traefik (built-in), ArgoCD, Keycloak 26, PostgreSQL 16, Docker, GitHub Actions, ghcr.io

---

## File Structure

```
myAwesomeApp/
├── .github/
│   └── workflows/
│       └── argocd-sync.yml                  # NEW: Trigger ArgoCD sync after push
├── k8s/
│   ├── postgresql-pvc.yaml                  # NEW: PostgreSQL persistent volume claim
│   ├── postgresql-deployment.yaml           # NEW: PostgreSQL deployment
│   ├── postgresql-service.yaml              # NEW: PostgreSQL service
│   ├── traefik-middleware.yaml              # NEW: HTTP→HTTPS redirect middleware
│   ├── keycloak-deployment.yaml             # MODIFY: production mode + PostgreSQL
│   ├── keycloak-ingress.yaml                # MODIFY: add TLS + hostname routing
│   ├── keycloak-configmap.yaml              # MODIFY: production redirect URIs
│   ├── demo-frontend-deployment.yaml        # MODIFY: production env vars
│   ├── demo-frontend-ingress.yaml           # MODIFY: add TLS + hostname routing
│   └── secrets.yaml                         # MODIFY: add PostgreSQL password
├── keycloak/
│   └── realm-export.json                    # MODIFY: production redirect URIs
└── scripts/
    └── setup-hetzner-cloud.sh                # NEW: Full provisioning + deploy script
```

---

### Task 1: Create PostgreSQL Manifests for Keycloak

**Files:**
- Create: `k8s/postgresql-pvc.yaml`
- Create: `k8s/postgresql-deployment.yaml`
- Create: `k8s/postgresql-service.yaml`

- [ ] **Step 1: Create the PostgreSQL PersistentVolumeClaim**

Create `k8s/postgresql-pvc.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgresql-data
  namespace: demo-app
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

- [ ] **Step 2: Create the PostgreSQL deployment**

Create `k8s/postgresql-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgresql
  namespace: demo-app
  labels:
    app: postgresql
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
        - name: postgresql
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: keycloak
            - name: POSTGRES_USER
              value: keycloak
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: demo-app-secrets
                  key: postgres-password
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: postgresql-data
```

- [ ] **Step 3: Create the PostgreSQL service**

Create `k8s/postgresql-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgresql
  namespace: demo-app
spec:
  selector:
    app: postgresql
  ports:
    - port: 5432
      targetPort: 5432
  type: ClusterIP
```

- [ ] **Step 4: Commit PostgreSQL manifests**

```bash
git add k8s/postgresql-pvc.yaml k8s/postgresql-deployment.yaml k8s/postgresql-service.yaml
git commit -m "feat: add PostgreSQL deployment for Keycloak persistent storage"
```

---

### Task 2: Create Traefik HTTP→HTTPS Redirect Middleware

**Files:**
- Create: `k8s/traefik-middleware.yaml`

- [ ] **Step 1: Create the redirect middleware**

Create `k8s/traefik-middleware.yaml`:

```yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: redirect-https
  namespace: demo-app
spec:
  redirectScheme:
    scheme: https
    permanent: true
```

- [ ] **Step 2: Commit middleware**

```bash
git add k8s/traefik-middleware.yaml
git commit -m "feat: add Traefik middleware for HTTP to HTTPS redirect"
```

---

### Task 3: Update Secrets for Production

**Files:**
- Modify: `k8s/secrets.yaml`

- [ ] **Step 1: Update secrets.yaml with PostgreSQL password**

Replace `k8s/secrets.yaml` with:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: demo-app-secrets
  namespace: demo-app
type: Opaque
stringData:
  keycloak-admin-password: "hackathon-demo-keycloak-admin"
  postgres-password: "hackathon-demo-postgres-password"
```

- [ ] **Step 2: Commit secrets**

```bash
git add k8s/secrets.yaml
git commit -m "refactor: add PostgreSQL password to secrets"
```

---

### Task 4: Update Keycloak Realm Config for Production

**Files:**
- Modify: `keycloak/realm-export.json`

- [ ] **Step 1: Update realm redirect URIs and SSL requirement**

Replace `keycloak/realm-export.json` with:

```json
{
  "realm": "myawesomeapp",
  "enabled": true,
  "sslRequired": "external",
  "registrationAllowed": true,
  "loginWithEmailAllowed": true,
  "duplicateEmailsAllowed": false,
  "resetPasswordAllowed": false,
  "editUsernameAllowed": false,
  "bruteForceProtected": false,
  "permanentLockout": false,
  "maxFailureWaitSeconds": 900,
  "minimumQuickLoginWaitSeconds": 60,
  "waitIncrementSeconds": 60,
  "quickLoginCheckMilliSeconds": 1000,
  "maxDeltaTimeSeconds": 43200,
  "failureFactor": 30,
  "defaultRole": {
    "name": "default-roles-myawesomeapp",
    "description": "${role_default-roles}",
    "composite": true,
    "clientRole": false
  },
  "requiredCredentials": ["password"],
  "otpPolicyType": "totp",
  "otpPolicyAlgorithm": "HmacSHA1",
  "otpPolicyInitialCounter": 0,
  "otpPolicyDigits": 6,
  "otpPolicyLookAheadWindow": 1,
  "otpPolicyPeriod": 30,
  "clients": [
    {
      "clientId": "myawesomeapp-frontend",
      "enabled": true,
      "publicClient": true,
      "standardFlowEnabled": true,
      "implicitFlowEnabled": true,
      "directAccessGrantsEnabled": false,
      "redirectUris": [
        "https://app.<DOMAIN>/dashboard*",
        "https://app.<DOMAIN>/*"
      ],
      "webOrigins": [
        "https://app.<DOMAIN>",
        "+"
      ],
      "attributes": {
        "pkce.code.challenge.method": "S256"
      },
      "fullScopeAllowed": true
    }
  ],
  "users": [
    {
      "username": "demo",
      "enabled": true,
      "email": "demo@myawesomeapp.dev",
      "firstName": "Demo",
      "lastName": "User",
      "credentials": [
        {
          "type": "password",
          "value": "demo",
          "temporary": false
        }
      ],
      "realmRoles": ["default-roles-myawesomeapp"]
    }
  ]
}
```

Changes from current:
- `sslRequired`: `"none"` → `"external"` (HTTPS for external requests, HTTP allowed internally)
- `redirectUris`: Removed `localhost` entries, added production domain
- `webOrigins`: Updated to production domain

- [ ] **Step 2: Commit realm config**

```bash
git add keycloak/realm-export.json
git commit -m "feat: update Keycloak realm config for production domain"
```

---

### Task 5: Update Keycloak Deployment for Production Mode

**Files:**
- Modify: `k8s/keycloak-deployment.yaml`

- [ ] **Step 1: Update Keycloak deployment to production mode with PostgreSQL**

Replace `k8s/keycloak-deployment.yaml` with:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: keycloak
  namespace: demo-app
  labels:
    app: keycloak
spec:
  replicas: 1
  selector:
    matchLabels:
      app: keycloak
  template:
    metadata:
      labels:
        app: keycloak
    spec:
      containers:
        - name: keycloak
          image: quay.io/keycloak/keycloak:26.0
          args:
            - start
            - --import-realm
          env:
            - name: KEYCLOAK_ADMIN
              value: admin
            - name: KEYCLOAK_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: demo-app-secrets
                  key: keycloak-admin-password
            - name: KC_PROXY
              value: "edge"
            - name: KC_HOSTNAME
              value: "auth.<DOMAIN>"
            - name: KC_HTTP_ENABLED
              value: "true"
            - name: KC_HEALTH_ENABLED
              value: "true"
            - name: KC_METRICS_ENABLED
              value: "true"
            - name: KC_DB
              value: "postgres"
            - name: KC_DB_URL
              value: "jdbc:postgresql://postgresql:5432/keycloak"
            - name: KC_DB_USERNAME
              value: "keycloak"
            - name: KC_DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: demo-app-secrets
                  key: postgres-password
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 20
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 500m
              memory: 1Gi
          volumeMounts:
            - name: realm-config
              mountPath: /opt/keycloak/data/import/
      volumes:
        - name: realm-config
          configMap:
            name: keycloak-realm-config
```

Key changes:
- `args`: `start-dev` → `start` (production mode)
- Added: `KC_PROXY=edge` — Keycloak trusts Traefik proxy headers
- Added: `KC_HOSTNAME=auth.<DOMAIN>` — public hostname
- Added: `KC_HTTP_ENABLED=true` — listens on HTTP internally (Traefik handles TLS)
- Added: `KC_DB=postgres`, `KC_DB_URL`, `KC_DB_USERNAME`, `KC_DB_PASSWORD` — PostgreSQL connection
- Memory limits increased to 1Gi (Keycloak needs more in production mode)
- Removed: `KC_HOSTNAME_STRICT` (now defaults to true in production mode, works with `KC_HOSTNAME`)

- [ ] **Step 2: Commit Keycloak deployment**

```bash
git add k8s/keycloak-deployment.yaml
git commit -m "feat: switch Keycloak to production mode with PostgreSQL and proxy config"
```

---

### Task 6: Update Keycloak Ingress with TLS and Hostname

**Files:**
- Modify: `k8s/keycloak-ingress.yaml`

- [ ] **Step 1: Update ingress with hostname-based routing and TLS**

Replace `k8s/keycloak-ingress.yaml` with:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: keycloak-ingress
  namespace: demo-app
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
spec:
  rules:
    - host: auth.<DOMAIN>
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: keycloak
                port:
                  number: 8080
  tls:
    - hosts:
        - auth.<DOMAIN>
      secretName: demo-app-tls
```

Key changes:
- Removed per-path routing (now routes all paths under `auth.<DOMAIN>`)
- Added `host: auth.<DOMAIN>` for hostname-based routing
- Changed entrypoint from `web` to `websecure` (HTTPS)
- Added `tls` section referencing the self-signed cert secret

- [ ] **Step 2: Commit Keycloak ingress**

```bash
git add k8s/keycloak-ingress.yaml
git commit -m "feat: add TLS and hostname routing to Keycloak ingress"
```

---

### Task 7: Update Frontend Ingress with TLS and Hostname

**Files:**
- Modify: `k8s/demo-frontend-ingress.yaml`

- [ ] **Step 1: Update frontend ingress with hostname and TLS**

Replace `k8s/demo-frontend-ingress.yaml` with:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: demo-frontend-ingress
  namespace: demo-app
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
spec:
  rules:
    - host: app.<DOMAIN>
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: demo-frontend
                port:
                  number: 80
  tls:
    - hosts:
        - app.<DOMAIN>
      secretName: demo-app-tls
```

- [ ] **Step 2: Commit frontend ingress**

```bash
git add k8s/demo-frontend-ingress.yaml
git commit -m "feat: add TLS and hostname routing to frontend ingress"
```

---

### Task 8: Update Frontend Deployment with Production URLs

**Files:**
- Modify: `k8s/demo-frontend-deployment.yaml`

- [ ] **Step 1: Update frontend env vars for production**

Replace `k8s/demo-frontend-deployment.yaml` with:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-frontend
  namespace: demo-app
  labels:
    app: demo-frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: demo-frontend
  template:
    metadata:
      labels:
        app: demo-frontend
    spec:
      containers:
        - name: demo-frontend
          image: ghcr.io/codedrifter-mx/myawesomeapp/demo-frontend:latest
          ports:
            - containerPort: 3000
          env:
            - name: NEXT_PUBLIC_KEYCLOAK_URL
              value: "https://auth.<DOMAIN>"
            - name: NEXT_PUBLIC_KEYCLOAK_REALM
              value: "myawesomeapp"
            - name: NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
              value: "myawesomeapp-frontend"
            - name: NEXT_PUBLIC_REDIRECT_URI
              value: "https://app.<DOMAIN>/dashboard"
            - name: NEXT_PUBLIC_FRONTEND_URL
              value: "https://app.<DOMAIN>"
            - name: NEXT_PUBLIC_LIVEOPS_URL
              value: "http://liveops-backend:4000"
          imagePullPolicy: Always
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
        - name: health-monitor
          image: ghcr.io/codedrifter-mx/myawesomeapp/health-monitor:latest
          env:
            - name: AUTH_HEALTH_URL
              value: "http://keycloak:8080/health/ready"
            - name: LIVEOPS_EVENTS_URL
              value: "http://liveops-backend:4000/api/events"
          imagePullPolicy: Always
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
```

Key changes:
- `NEXT_PUBLIC_KEYCLOAK_URL`: `http://keycloak:8080` → `https://auth.<DOMAIN>` (browser needs public URL)
- `NEXT_PUBLIC_REDIRECT_URI`: `http://demo-frontend/dashboard` → `https://app.<DOMAIN>/dashboard`
- `NEXT_PUBLIC_FRONTEND_URL`: `http://demo-frontend` → `https://app.<DOMAIN>`
- Added `imagePullPolicy: Always` for latest tag updates

- [ ] **Step 2: Commit frontend deployment**

```bash
git add k8s/demo-frontend-deployment.yaml
git commit -m "feat: update frontend deployment with production URLs"
```

---

### Task 9: Update Keycloak ConfigMap for Production

**Files:**
- Modify: `k8s/keycloak-configmap.yaml`

- [ ] **Step 1: Update ConfigMap realm JSON with production redirect URIs**

Replace the client section in `k8s/keycloak-configmap.yaml` (update the `redirectUris` and `webOrigins` inside the JSON):

The full file should be replaced to match the realm config changes from Task 4. The key changes in the client section:

```yaml
data:
  realm-export.json: |
    {
      ...
      "clients": [
        {
          "clientId": "myawesomeapp-frontend",
          ...
          "redirectUris": [
            "https://app.<DOMAIN>/dashboard*",
            "https://app.<DOMAIN>/*"
          ],
          "webOrigins": [
            "https://app.<DOMAIN>",
            "+"
          ],
          ...
        }
      ],
      ...
    }
```

Replace the entire `k8s/keycloak-configmap.yaml` with the updated realm JSON (same as Task 4 but inlined as ConfigMap data):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: keycloak-realm-config
  namespace: demo-app
data:
  realm-export.json: |
    {
      "realm": "myawesomeapp",
      "enabled": true,
      "sslRequired": "external",
      "registrationAllowed": true,
      "loginWithEmailAllowed": true,
      "duplicateEmailsAllowed": false,
      "resetPasswordAllowed": false,
      "editUsernameAllowed": false,
      "bruteForceProtected": false,
      "permanentLockout": false,
      "maxFailureWaitSeconds": 900,
      "minimumQuickLoginWaitSeconds": 60,
      "waitIncrementSeconds": 60,
      "quickLoginCheckMilliSeconds": 1000,
      "maxDeltaTimeSeconds": 43200,
      "failureFactor": 30,
      "defaultRole": {
        "name": "default-roles-myawesomeapp",
        "description": "${role_default-roles}",
        "composite": true,
        "clientRole": false
      },
      "requiredCredentials": ["password"],
      "otpPolicyType": "totp",
      "otpPolicyAlgorithm": "HmacSHA1",
      "otpPolicyInitialCounter": 0,
      "otpPolicyDigits": 6,
      "otpPolicyLookAheadWindow": 1,
      "otpPolicyPeriod": 30,
      "clients": [
        {
          "clientId": "myawesomeapp-frontend",
          "enabled": true,
          "publicClient": true,
          "standardFlowEnabled": true,
          "implicitFlowEnabled": true,
          "directAccessGrantsEnabled": false,
          "redirectUris": [
            "https://app.<DOMAIN>/dashboard*",
            "https://app.<DOMAIN>/*"
          ],
          "webOrigins": [
            "https://app.<DOMAIN>",
            "+"
          ],
          "attributes": {
            "pkce.code.challenge.method": "S256"
          },
          "fullScopeAllowed": true
        }
      ],
      "users": [
        {
          "username": "demo",
          "enabled": true,
          "email": "demo@myawesomeapp.dev",
          "firstName": "Demo",
          "lastName": "User",
          "credentials": [
            {
              "type": "password",
              "value": "demo",
              "temporary": false
            }
          ],
          "realmRoles": ["default-roles-myawesomeapp"]
        }
      ]
    }
```

- [ ] **Step 2: Commit ConfigMap**

```bash
git add k8s/keycloak-configmap.yaml
git commit -m "feat: update Keycloak ConfigMap with production redirect URIs"
```

---

### Task 10: Create Setup Script for Hetzner Cloud Instance

**Files:**
- Create: `scripts/setup-hetzner-cloud.sh`

This is a one-shot bash script that runs on the fresh Ubuntu 24.04 Hetzner instance. It:
1. Installs k3s with TLS SAN for the domain
2. Generates a self-signed wildcard TLS cert
3. Creates the TLS secret in k3s
4. Installs ArgoCD
5. Applies all k8s manifests (after substituting `<DOMAIN>`)
6. Configures ArgoCD Application

- [ ] **Step 1: Create the setup script**

Create `scripts/setup-hetzner-cloud.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# myAwesomeApp - Hetzner Cloud Production Setup
# Run this on a fresh Ubuntu 24.04 Hetzner CX32 instance
# ============================================================

echo "============================================"
echo "  myAwesomeApp Hetzner Cloud Setup"
echo "============================================"

# --- Configuration ---
read -rp "Enter your domain (e.g. myawesomeapp.dev): " DOMAIN
if [ -z "$DOMAIN" ]; then
  echo "ERROR: Domain cannot be empty"
  exit 1
fi

GITHUB_REPO="https://github.com/codedrifter-mx/myAwesomeApp.git"
K3S_VERSION="v1.30"
ARGOCD_VERSION="stable"

echo ""
echo "Domain: $DOMAIN"
echo "Repo: $GITHUB_REPO"
echo ""

# --- Step 1: System updates ---
echo ">>> Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl git openssl

# --- Step 2: Install k3s ---
echo ">>> Installing k3s..."
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_VERSION="$K3S_VERSION" \
  sh -s - \
  --tls-san "$DOMAIN" \
  --tls-san "app.$DOMAIN" \
  --tls-san "auth.$DOMAIN" \
  --tls-san "argocd.$DOMAIN"

echo ">>> Waiting for k3s to be ready..."
sleep 10
k3s kubectl wait --for=condition=Ready node --all --timeout=120s

# --- Step 3: Create symlink for kubectl ---
mkdir -p "$HOME/.kube"
cp /etc/rancher/k3s/k3s.yaml "$HOME/.kube/config"
chmod 600 "$HOME/.kube/config"

export KUBECONFIG="$HOME/.kube/config"
echo "export KUBECONFIG=\$HOME/.kube/config" >> "$HOME/.bashrc"

kubectl get nodes

# --- Step 4: Generate wildcard self-signed TLS certificate ---
echo ">>> Generating self-signed TLS certificate for *.$DOMAIN..."
CERT_DIR="/tmp/tls-$DOMAIN"
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/tls.key" \
  -out "$CERT_DIR/tls.crt" \
  -subj "/CN=*.$DOMAIN" \
  -addext "subjectAltName=DNS:*.$DOMAIN,DNS:$DOMAIN"

kubectl create namespace demo-app --dry-run=client -o yaml | kubectl apply -f -
kubectl delete secret demo-app-tls -n demo-app 2>/dev/null || true
kubectl create secret tls demo-app-tls \
  --cert="$CERT_DIR/tls.crt" \
  --key="$CERT_DIR/tls.key" \
  -n demo-app

rm -rf "$CERT_DIR"
echo ">>> TLS certificate created as secret 'demo-app-tls' in namespace 'demo-app'"

# --- Step 5: Clone repo and substitute domain ---
echo ">>> Cloning repository..."
TMP_DIR=$(mktemp -d)
git clone "$GITHUB_REPO" "$TMP_DIR"
cd "$TMP_DIR"
git checkout main

echo ">>> Substituting <DOMAIN> with $DOMAIN in k8s manifests..."
find k8s/ -type f -name "*.yaml" -exec sed -i "s/<DOMAIN>/$DOMAIN/g" {} \;
find keycloak/ -type f -name "*.json" -exec sed -i "s/<DOMAIN>/$DOMAIN/g" {} \;

echo ">>> Applying k8s manifests..."
kubectl apply -f k8s/

echo ">>> Waiting for PostgreSQL to start..."
kubectl wait --for=condition=ready pod -l app=postgresql -n demo-app --timeout=120s || true

echo ">>> Waiting for Keycloak to start..."
kubectl wait --for=condition=ready pod -l app=keycloak -n demo-app --timeout=180s || true

echo ">>> Waiting for frontend to start..."
kubectl wait --for=condition=ready pod -l app=demo-frontend -n demo-app --timeout=120s || true

echo ""
echo ">>> All application pods:"
kubectl get pods -n demo-app

echo ""
echo ">>> All services:"
kubectl get svc -n demo-app

echo ""
echo ">>> All ingresses:"
kubectl get ingress -n demo-app

# --- Step 6: Install ArgoCD ---
echo ""
echo ">>> Installing ArgoCD..."
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f "https://raw.githubusercontent.com/argoproj/argo-cd/$ARGOCD_VERSION/manifests/install.yaml"

echo ">>> Waiting for ArgoCD pods..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=180s || true

kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}' || true

echo ""
echo ">>> ArgoCD admin password:"
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" 2>/dev/null | base64 -d || echo "(password will be available shortly, check with: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d)"

# --- Step 7: Create ArgoCD Ingress ---
echo ""
echo ">>> Creating ArgoCD ingress..."
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-ingress
  namespace: argocd
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
spec:
  rules:
    - host: argocd.$DOMAIN
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 80
  tls:
    - hosts:
        - argocd.$DOMAIN
      secretName: demo-app-tls
EOF

# --- Step 8: Connect ArgoCD to GitHub repo ---
echo ""
echo ">>> Configuring ArgoCD Application..."
cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: $GITHUB_REPO
    targetRevision: HEAD
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: demo-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
EOF

echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "  Domain:        $DOMAIN"
echo "  App URL:       https://app.$DOMAIN"
echo "  Keycloak:      https://auth.$DOMAIN"
echo "  ArgoCD:        https://argocd.$DOMAIN"
echo ""
echo "  Keycloak Admin:  admin / (from secret)"
echo "  Demo User:       demo / demo"
echo "  ArgoCD Login:    admin / (from password above)"
echo ""
echo "  NOTE: If you replaced <DOMAIN> before pushing (Task 12 Step 1),"
echo "  the manifests on main already have your actual domain."
echo "  If you skipped that step, the manifests were patched locally."
echo "  After verifying everything works, update the repo files"
echo "  with your actual domain and push to main — ArgoCD will sync."
echo ""
echo "============================================"
```

- [ ] **Step 2: Make the script executable**

```bash
git add scripts/setup-hetzner-cloud.sh
git commit -m "feat: add Hetzner Cloud provisioning and setup script"
```

- [ ] **Step 2: Make the script executable**

```bash
git add scripts/setup-oracle-cloud.sh
git commit -m "feat: add Oracle Cloud provisioning and setup script"
```

---

### Task 11: Create ArgoCD Sync GitHub Action

**Files:**
- Create: `.github/workflows/argocd-sync.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/argocd-sync.yml`:

```yaml
name: Trigger ArgoCD Sync

on:
  push:
    branches: [main]
    paths:
      - 'k8s/**'
      - 'keycloak/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Notify ArgoCD
        run: |
          echo "Push to main detected with k8s/keycloak changes."
          echo "ArgoCD auto-sync is enabled (poll every 3 minutes)."
          echo "No manual trigger needed — ArgoCD will detect and deploy."
          echo ""
          echo "To force an immediate sync, run:"
          echo "  argocd app sync demo-app"
```

Note: ArgoCD's auto-sync polls the repo every 3 minutes by default. For hackathon purposes, this is sufficient. The workflow serves as documentation and can be upgraded to trigger ArgoCD webhooks later.

- [ ] **Step 2: Commit workflow**

```bash
git add .github/workflows/argocd-sync.yml
git commit -m "feat: add ArgoCD sync notification workflow"
```

---

### Task 12: Push, Provision Hetzner Cloud, and Deploy

This task is an ordered sequence of manual steps.

- [ ] **Step 1: Replace all `<DOMAIN>` placeholders with your actual domain**

Before pushing, search-and-replace `<DOMAIN>` in all files:

```bash
# In the repo, replace with your actual domain
$domain="your-actual-domain.com"

# Update all files
Get-ChildItem -Recurse -File -Include "*.yaml","*.json","*.sh","*.yml" -Exclude "*node_modules*" | ForEach-Object {
    (Get-Content $_.FullName) -replace '<DOMAIN>', $domain | Set-Content $_.FullName
}
```

- [ ] **Step 2: Push all changes to main**

```bash
git push origin main
```

- [ ] **Step 3: Verify all GitHub Actions workflows build successfully**

Check https://github.com/codedrifter-mx/myAwesomeApp/actions for:
- `demo-frontend.yml` — builds frontend Docker image
- `health-monitor.yml` — builds health-monitor Docker image
- `keycloak.yml` — builds Keycloak Docker image

Wait for all three to complete successfully.

- [ ] **Step 4: Provision Hetzner Cloud CX32 instance**

1. Log into https://console.hetzner.cloud
2. Click **"Add Project"** → name it `myAwesomeApp` → **Create Project**
3. Click **"Add Server"**:
   - **Name**: `hackathon-k3s`
   - **Location**: `Nuremberg` or `Helsinki` (choose closest to you)
   - **Image**: `Ubuntu 24.04`
   - **Type**: `CX32` (4 vCPU, 8GB RAM, 80GB NVMe)
   - **SSH Key**: Add your public key (paste the key from earlier)
   - **Firewall**: Leave unassigned for now (we'll create one next)
   - **Volumes**: None
4. Click **"Create & Buy Now"**
5. Note the **Public IP Address** shown after creation

- [ ] **Step 5: Create and apply Hetzner Firewall**

1. In the Hetzner Cloud Console, go to **Firewalls** → **"Create Firewall"**
2. Name: `hackathon-fw`
3. Add Ingress Rules:
   - Rule 1: Port `22` (SSH), source `0.0.0.0/0`
   - Rule 2: Port `80` (HTTP), source `0.0.0.0/0`
   - Rule 3: Port `443` (HTTPS), source `0.0.0.0/0`
   - Rule 4 (optional): Port `6443` (k8s API), source `YOUR_IP` (for remote kubectl)
4. Click **"Create Firewall"**
5. Go to Firewalls → click `hackathon-fw` → **"Apply to"** → select your server → **Apply**

- [ ] **Step 6: Configure DNS**

Create A records at your DNS provider (Cloudflare, Namecheap, etc.):

| Record | Type | Value |
|--------|------|-------|
| `app.<DOMAIN>` | A | Instance Public IP |
| `auth.<DOMAIN>` | A | Instance Public IP |
| `argocd.<DOMAIN>` | A | Instance Public IP |

Wait for DNS propagation (may take several minutes to hours).

- [ ] **Step 7: Run the setup script on the instance**

```bash
ssh root@<public-ip>

# Clone the repo
apt-get update && apt-get install -y git
git clone https://github.com/codedrifter-mx/myAwesomeApp.git
cd myAwesomeApp

# Make the script executable and run it
chmod +x scripts/setup-hetzner-cloud.sh
./scripts/setup-hetzner-cloud.sh
```

When prompted, enter your domain name.

Note: Hetzner instances use `root` user by default (not `ubuntu` like Oracle).

- [ ] **Step 8: Verify all services are running**

```bash
kubectl get pods -n demo-app
```

Expected output (all `Running`):
```
NAME                                  READY   STATUS    RESTARTS   AGE
postgresql-xxxxx                      1/1     Running   0          1m
keycloak-xxxxx                        1/1     Running   0          1m
demo-frontend-xxxxx                   2/2     Running   0          1m
```

```bash
kubectl get ingress -n demo-app
```

Expected output:
```
NAME                    CLASS     HOSTS              ADDRESS        PORTS     AGE
demo-frontend-ingress   traefik   app.<DOMAIN>       <instance-ip>  80,443    1m
keycloak-ingress        traefik   auth.<DOMAIN>      <instance-ip>  80,443    1m
```

- [ ] **Step 9: Verify end-to-end flow**

1. Open `https://app.<DOMAIN>` in a browser (accept self-signed cert warning)
2. You should see the myAwesomeApp landing page with "Sign In" and "Create Account" buttons
3. Click "Sign In" — should redirect to `https://auth.<DOMAIN>/realms/myawesomeapp/...`
4. Accept the self-signed cert warning on the Keycloak page
5. Log in with `demo / demo`
6. Should redirect back to `https://app.<DOMAIN>/dashboard#access_token=...`
7. Dashboard shows "Welcome, Demo User" and Keycloak health status
8. ArgoCD UI at `https://argocd.<DOMAIN>` — log in with admin / (password from script output)

- [ ] **Step 10: Test health monitor + incident flow**

1. Kill Keycloak: `kubectl delete pod -n demo-app -l app=keycloak`
2. The health monitor sidecar polls every 5 seconds, detects failure after 15 seconds
3. Health monitor pushes incident event to LiveOps (errors expected if LiveOps not deployed)
4. ArgoCD auto-heals the Keycloak pod (selfHeal: true)
5. Keycloak comes back, health monitor detects recovery, pushes recovery event

- [ ] **Step 11: Update repo manifests with actual domain**

After verifying everything works:
1. Update all `<DOMAIN>` placeholders in the repo with the actual domain
2. Push to main
3. ArgoCD will now manage the manifests from the repo (they'll match what's deployed)

---

### Task 13: (Optional) Set Up Let's Encrypt for Proper HTTPS

**Files:**
- Modify: `scripts/setup-hetzner-cloud.sh` (add cert-manager step)

This is an optional upgrade after the initial setup is working.

- [ ] **Step 1: Install cert-manager on k3s**

SSH into the instance:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.15/cert-manager.yaml
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=120s
```

- [ ] **Step 2: Create a ClusterIssuer for Let's Encrypt**

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@<DOMAIN>
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: traefik
EOF
```

- [ ] **Step 3: Update ingresses to use cert-manager annotations**

Update each ingress to add:
```yaml
metadata:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
spec:
  tls:
    - hosts:
        - app.<DOMAIN>
      secretName: app-tls
```

cert-manager automatically provisions and renews Let's Encrypt certificates.

---

## DNS Summary

| Record | Type | Value | Purpose |
|--------|------|-------|---------|
| `app.<DOMAIN>` | A | Instance Public IP | Frontend Next.js app |
| `auth.<DOMAIN>` | A | Instance Public IP | Keycloak identity provider |
| `argocd.<DOMAIN>` | A | Instance Public IP | ArgoCD GitOps UI |

---

## Resource Budget

| Component | CPU Request | RAM Request | CPU Limit | RAM Limit |
|-----------|-------------|-------------|-----------|-----------|
| k3s system overhead | ~500m | ~1GB | — | — |
| ArgoCD (3 pods) | 500m | 1.5GB | 1 | 2GB |
| Keycloak | 250m | 512Mi | 500m | 1Gi |
| PostgreSQL | 250m | 256Mi | 500m | 512Mi |
| Frontend | 100m | 128Mi | 250m | 256Mi |
| Health Monitor | 50m | 64Mi | 100m | 128Mi |
| **Total** | **~1.65** | **~3.46GB** | | |
| **Hetzner CX32** | **4** | **8GB** | | |

All services fit comfortably on the CX32 with ~4.5GB RAM to spare for LiveOps and other workloads.
