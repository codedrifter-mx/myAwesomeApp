#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# myAwesomeApp - Oracle Cloud Production Setup
# Run this on a fresh Ubuntu 22.04 Oracle Cloud ARM instance
# ============================================================

echo "============================================"
echo "  myAwesomeApp Oracle Cloud Setup"
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
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
sudo apt-get install -y -qq curl git openssl

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
sudo k3s kubectl wait --for=condition=Ready node --all --timeout=120s

# --- Step 3: Create symlink for kubectl ---
mkdir -p "$HOME/.kube"
sudo cp /etc/rancher/k3s/k3s.yaml "$HOME/.kube/config"
sudo chown "$USER:$USER" "$HOME/.kube/config"
chmod 600 "$HOME/.kube/config"

export KUBECONFIG="$HOME/.kube/config"
echo "export KUBECONFIG=\$HOME/.kube/config" >> "$HOME/.bashrc"

# Verify
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

BRANCH="feat/demo-app-implementation"
echo ">>> Checking out branch: $BRANCH"
git checkout "$BRANCH" 2>/dev/null || git checkout main

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
