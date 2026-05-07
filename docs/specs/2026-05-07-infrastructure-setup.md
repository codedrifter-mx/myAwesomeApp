# Infrastructure Setup — Oracle Cloud k3s + ArgoCD

**Date**: 2026-05-07
**Hackathon**: Generative UI Global Hackathon: Agentic Interfaces, May 9th 2026

## Overview

Both the Demo App and LiveOps Dashboard run on a single Oracle Cloud Always Free ARM instance running k3s with ArgoCD. This document covers the complete setup from zero to running cluster.

## Oracle Cloud Setup

### Sign Up
1. Go to https://cloud.oracle.com and sign up for Always Free tier
2. You'll need a credit card on file but won't be charged for Always Free resources
3. Set your home region to **us-phoenix-1** (closest available region with ARM capacity)

### Provision ARM Instance
1. Navigate to Compute → Instances → Create Instance
2. Configuration:
   - **Name**: `hackathon-k3s`
   - **Image**: Ubuntu 22.04 (Canonical)
   - **Shape**: Ampere A1 (4 OCPU, 24GB RAM) — Always Free eligible
   - **Boot volume**: 50GB (default is fine)
   - **SSH key**: Upload your public key or generate a new one
3. If you get "Out of capacity" error:
   - Try a different availability domain in the same region
   - Try us-ashburn-1 or another region
   - Retry later (capacity fluctuates)
4. Note the **Public IP Address** after creation

### Configure Security
1. Navigate to Networking → Virtual Cloud Networks → your VCN → Security Lists
2. Add Ingress Rules:
   - Port 80 (HTTP) — source 0.0.0.0/0
   - Port 443 (HTTPS) — source 0.0.0.0/0
   - Port 6443 (k8s API) — source your IP
   - Port 30000-32767 (NodePort range) — source 0.0.0.0/0
   - Port 8080 (demo app) — source 0.0.0.0/0
   - Port 4000 (LiveOps backend) — source 0.0.0.0/0
3. Ensure Egress Rules allow all outbound (default)

### Connect via SSH
```bash
ssh -i <your-private-key> ubuntu@<public-ip>
```

## k3s Installation

### Install k3s
```bash
# Install k3s (single-node cluster)
curl -sfL https://get.k3s.io | sh -

# Wait for k3s to be ready
sudo systemctl status k3s

# Verify nodes
sudo k3s kubectl get nodes
```

### Configure kubectl for Local Access
```bash
# Copy kubeconfig to local machine
scp ubuntu@<public-ip>:/etc/rancher/k3s/k3s.yaml ~/.kube/config

# Replace 127.0.0.1 with the public IP
sed -i 's/127.0.0.1/<public-ip>/g' ~/.kube/config

# Test from local machine
kubectl get nodes
```

### Increase File Descriptors (Recommended)
```bash
# On the Oracle instance
echo "fs.file-max = 65536" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## ArgoCD Installation

### Install ArgoCD on k3s
```bash
# Create ArgoCD namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s

# Get ArgoCD admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### Expose ArgoCD UI
```bash
# Patch ArgoCD service to LoadBalancer (k3s will assign an external IP)
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

# Get the external IP
kubectl get svc argocd-server -n argocd

# Access ArgoCD UI at https://<external-ip>
# Username: admin
# Password: <from previous step>
```

### Connect ArgoCD to GitHub Repo
1. Log in to ArgoCD UI
2. Go to Settings → Repositories → Connect Repo
3. Connect `https://github.com/codedrifter-mx/myAwesomeApp.git`
4. Repeat for the LiveOps repo when created
5. Alternatively, use the ArgoCD CLI:
   ```bash
   argocd login <argocd-server-ip>
   argocd repo add https://github.com/codedrifter-mx/myAwesomeApp.git
   ```

## Deploy Demo App

### Create ArgoCD Application
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/codedrifter-mx/myAwesomeApp.git
    targetRevision: HEAD
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: demo-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Create ArgoCD Application for LiveOps
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: liveops-dashboard
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/codedrifter-mx/liveops-dashboard.git
    targetRevision: HEAD
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: liveops
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## GitHub Actions CI/CD

Each service needs a GitHub Actions workflow that:
1. Builds a Docker image
2. Pushes to GitHub Container Registry (ghcr.io)
3. Updates the k8s manifest with the new image tag
4. ArgoCD detects the change and auto-deploys

**Required GitHub Secrets** (set in repo Settings → Secrets):
- `CR_PAT`: GitHub Personal Access Token with `write:packages` scope
- `KUBECONFIG`: Base64-encoded k3s kubeconfig (for manual deployments if needed)

**Creating the CR_PAT**:
1. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Create token with `write:packages` scope for the repo
3. Add as repository secret `CR_PAT`

## Twilio Setup

1. Sign up at https://www.twilio.com
2. Purchase a phone number capable of calling Mexico (~$1/month)
3. Get your Account SID, Auth Token, and Phone Number
4. Store as environment variables in the LiveOps backend deployment:
   ```yaml
   env:
   - name: TWILIO_ACCOUNT_SID
     valueFrom:
       secretKeyRef:
         name: liveops-secrets
         key: twilio-account-sid
   - name: TWILIO_AUTH_TOKEN
     valueFrom:
       secretKeyRef:
         name: liveops-secrets
         key: twilio-auth-token
   - name: TWILIO_PHONE_NUMBER
     valueFrom:
       secretKeyRef:
         name: liveops-secrets
         key: twilio-phone-number
   - name: OWNER_PHONE_NUMBER
     valueFrom:
       secretKeyRef:
         name: liveops-secrets
         key: owner-phone-number
   ```

## Setup Checklist (Pre-Hackathon)

- [ ] Oracle Cloud account created, ARM instance provisioned
- [ ] SSH access confirmed
- [ ] k3s installed and verified (kubectl get nodes)
- [ ] ArgoCD installed and accessible via browser
- [ ] ArgoCD connected to both GitHub repos
- [ ] Security groups configured (ports 80, 443, 6443, 30000-32767, 8080, 4000)
- [ ] Twilio account created with Mexico phone number
- [ ] GitHub Actions workflows pushing to ghcr.io
- [ ] Both demo app services building and pushing Docker images
- [ ] ArgoCD syncing both applications automatically
- [ ] Verified: can manually delete auth pod and see ArgoCD auto-heal it

## Estimated Resource Usage

| Component | CPU | RAM |
|-----------|-----|-----|
| k3s system | 0.5 | 1GB |
| ArgoCD (controller + server + repo-server) | 0.5 | 1.5GB |
| Demo Frontend | 0.25 | 256MB |
| Auth Service | 0.25 | 256MB |
| LiveOps Frontend | 0.25 | 256MB |
| LiveOps Backend | 0.5 | 512MB |
| **Total** | **2.25** | **3.75GB** |
| **Available** | **4** | **24GB** |

Plenty of headroom. The 24GB RAM on the free ARM instance is more than sufficient.