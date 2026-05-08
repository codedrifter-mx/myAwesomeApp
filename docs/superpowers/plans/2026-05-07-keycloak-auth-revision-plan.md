# myAwesomeApp Revision: Keycloak Auth + Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom Express auth microservice with Keycloak as the identity provider, add a proper landing page with Login/Register buttons, and configure implicit flow redirect back to the frontend dashboard.

**Architecture:** Keycloak runs as a Docker container in k3s, configured with a `myawesomeapp` realm and a single client for the frontend. The frontend landing page shows "Sign In" and "Create Account" buttons that redirect to Keycloak's login/register pages. After authentication, Keycloak redirects back to the frontend dashboard with the access token in the URL fragment (implicit flow). The health monitor polls Keycloak's health endpoint instead of the Express `/health` endpoint.

**Tech Stack:** Keycloak 26 (Docker/Helm), Next.js 14, k3s, ArgoCD

---

## File Structure

```
myAwesomeApp/
├── keycloak/
│   ├── realm-export.json          # Keycloak realm configuration (exported/imported)
│   ├── Dockerfile                 # Custom Keycloak image with realm pre-configured
│   └── README.md                  # Keycloak setup instructions
├── k8s/
│   ├── namespace.yaml             # (keep, update demo-app → add keycloak)
│   ├── keycloak-deployment.yaml  # Keycloak deployment (replaces auth-service)
│   ├── keycloak-service.yaml     # Keycloak service
│   ├── keycloak-ingress.yaml     # Keycloak ingress
│   ├── keycloak-configmap.yaml   # Realm configuration as ConfigMap
│   ├── demo-frontend-deployment.yaml  # (update: remove auth-service env, add Keycloak env)
│   ├── demo-frontend-service.yaml     # (keep)
│   ├── demo-frontend-ingress.yaml     # (keep, update routes)
│   └── secrets.yaml              # (update: add Keycloak admin credentials)
├── services/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx          # REPLACE: landing page with Login/Register buttons
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx      # REMOVE (no longer needed, Keycloak handles login)
│   │   │   │   └── dashboard/
│   │   │   │       └── page.tsx      # UPDATE: read token from Keycloak redirect
│   │   │   └── lib/
│   │   │       └── auth.ts           # UPDATE: Keycloak token handling
│   │   └── ... (existing config files)
│   └── auth/                          # DELETE ENTIRE DIRECTORY (replaced by Keycloak)
├── scripts/
│   ├── health-monitor.ts             # UPDATE: poll Keycloak health endpoint
│   ├── Dockerfile                    # (keep)
│   └── package.json                  # (keep)
└── .github/
    └── workflows/
        ├── auth-service.yml          # DELETE (replaced by Keycloak Helm chart)
        ├── keycloak.yml              # CREATE: Build custom Keycloak image with realm
        ├── demo-frontend.yml         # (keep)
        └── health-monitor.yml         # (keep)
```

---

### Task 1: Delete Express Auth Service

**Files:**
- Delete: `services/auth/` (entire directory)
- Delete: `.github/workflows/auth-service.yml`

- [ ] **Step 1: Delete the auth service directory**

```bash
cd C:\Users\Kazuk\projects\myAwesomeApp
Remove-Item -Recurse -Force services\auth
```

- [ ] **Step 2: Delete the auth service CI/CD workflow**

```bash
Remove-Item -Force .github\workflows\auth-service.yml
```

- [ ] **Step 3: Commit the removal**

```bash
git add -A
git commit -m "refactor: remove custom Express auth service (replaced by Keycloak)"
```

---

### Task 2: Create Keycloak Realm Configuration

**Files:**
- Create: `keycloak/realm-export.json`
- Create: `keycloak/README.md`

- [ ] **Step 1: Create Keycloak realm export file**

Create `keycloak/realm-export.json`:

```json
{
  "realm": "myawesomeapp",
  "enabled": true,
  "sslRequired": "none",
  "registrationAllowed": true,
  "loginWithEmailAllowed": true,
  "duplicate EmailsAllowed": false,
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
        "http://localhost:3000/dashboard*",
        "http://localhost:3000/*",
        "http://demo-frontend/*",
        "http://demo-frontend/dashboard*"
      ],
      "webOrigins": [
        "http://localhost:3000",
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

- [ ] **Step 2: Create Keycloak README**

Create `keycloak/README.md`:

```markdown
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
- Health: `http://<keycloak-url>/health`
```

- [ ] **Step 3: Commit Keycloak configuration**

```bash
git add keycloak/
git commit -m "feat: add Keycloak realm configuration with demo user and implicit flow client"
```

---

### Task 3: Create Keycloak Dockerfile and K8s Manifests

**Files:**
- Create: `keycloak/Dockerfile`
- Create: `k8s/keycloak-deployment.yaml`
- Create: `k8s/keycloak-service.yaml`
- Create: `k8s/keycloak-ingress.yaml`
- Create: `k8s/keycloak-configmap.yaml`
- Delete: `k8s/auth-service-deployment.yaml`
- Delete: `k8s/auth-service-service.yaml`
- Delete: `k8s/auth-service-ingress.yaml`
- Modify: `k8s/secrets.yaml` (add Keycloak admin credentials)

- [ ] **Step 1: Create Keycloak Dockerfile**

Create `keycloak/Dockerfile`:

```dockerfile
FROM quay.io/keycloak/keycloak:26.0

# Copy realm configuration
COPY realm-export.json /opt/keycloak/data/import/realm-export.json

# Environment variables for standalone mode
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_HOSTNAME_STRICT=false
ENV KC_HTTP_ENABLED=true

# Run in start-dev mode for hackathon (production mode requires HTTPS)
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start-dev", "--import-realm"]
```

- [ ] **Step 2: Create Keycloak ConfigMap for realm config**

Create `k8s/keycloak-configmap.yaml`:

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
      "sslRequired": "none",
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
            "http://localhost:3000/dashboard*",
            "http://localhost:3000/*",
            "http://demo-frontend/dashboard*",
            "http://demo-frontend/*"
          ],
          "webOrigins": ["http://localhost:3000", "+"],
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

- [ ] **Step 3: Create Keycloak deployment**

Create `k8s/keycloak-deployment.yaml`:

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
            - start-dev
            - --import-realm
          env:
            - name: KEYCLOAK_ADMIN
              value: admin
            - name: KEYCLOAK_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: demo-app-secrets
                  key: keycloak-admin-password
            - name: KC_HEALTH_ENABLED
              value: "true"
            - name: KC_METRICS_ENABLED
              value: "true"
            - name: KC_HOSTNAME_STRICT
              value: "false"
            - name: KC_HTTP_ENABLED
              value: "true"
            - name: KC_DB
              value: "dev-mem"
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

- [ ] **Step 4: Create Keycloak service**

Create `k8s/keycloak-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: keycloak
  namespace: demo-app
spec:
  selector:
    app: keycloak
  ports:
    - port: 8080
      targetPort: 8080
  type: ClusterIP
```

- [ ] **Step 5: Create Keycloak ingress**

Create `k8s/keycloak-ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: keycloak-ingress
  namespace: demo-app
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  rules:
    - http:
        paths:
          - path: /realms
            pathType: Prefix
            backend:
              service:
                name: keycloak
                port:
                  number: 8080
          - path: /resources
            pathType: Prefix
            backend:
              service:
                name: keycloak
                port:
                  number: 8080
          - path: /admin
            pathType: Prefix
            backend:
              service:
                name: keycloak
                port:
                  number: 8080
          - path: /health
            pathType: Prefix
            backend:
              service:
                name: keycloak
                port:
                  number: 8080
```

- [ ] **Step 6: Update secrets.yaml**

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
```

- [ ] **Step 7: Delete old auth service manifests**

```bash
Remove-Item -Force k8s\auth-service-deployment.yaml
Remove-Item -Force k8s\auth-service-service.yaml
Remove-Item -Force k8s\auth-service-ingress.yaml
```

- [ ] **Step 8: Update namespace.yaml to include keycloak label**

The namespace.yaml is fine as-is. No changes needed.

- [ ] **Step 9: Commit Keycloak k8s manifests**

```bash
git add -A
git commit -m "feat: add Keycloak identity provider, remove Express auth service manifests"
```

---

### Task 4: Update Frontend Landing Page with Login/Register Buttons

**Files:**
- Modify: `services/frontend/src/app/page.tsx`
- Delete: `services/frontend/src/app/login/page.tsx`
- Modify: `services/frontend/src/lib/auth.ts`

- [ ] **Step 1: Replace the landing page**

Replace `services/frontend/src/app/page.tsx` with:

```tsx
export default function HomePage() {
  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'myawesomeapp';
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'myawesomeapp-frontend';
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/dashboard';
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

  const loginUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=openid`;

  const registerUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/registrations?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=openid`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>myAwesomeApp</h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>Demo application for LiveOps incident response</p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <a
          href={loginUrl}
          style={{
            padding: '0.75rem 2rem',
            background: '#38b2ac',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1rem',
          }}
        >
          Sign In
        </a>
        <a
          href={registerUrl}
          style={{
            padding: '0.75rem 2rem',
            background: 'transparent',
            color: '#38b2ac',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            border: '2px solid #38b2ac',
          }}
        >
          Create Account
        </a>
      </div>
      <p style={{ color: '#555', marginTop: '2rem', fontSize: '0.85rem' }}>
        Demo credentials: demo / demo
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Delete the login page (no longer needed)**

```bash
Remove-Item -Force services\frontend\src\app\login\page.tsx
Remove-Item -Force services\frontend\src\app\login
```

- [ ] **Step 3: Update auth.ts for Keycloak token handling**

Replace `services/frontend/src/lib/auth.ts` with:

```typescript
export interface UserInfo {
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
  realm_roles: string[];
}

export function getTokenFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get('access_token');
}

export async function fetchUserInfo(token: string): Promise<UserInfo | null> {
  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'myawesomeapp';
  try {
    const res = await fetch(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      sub: data.sub,
      email: data.email || '',
      name: data.name || data.preferred_username || '',
      preferred_username: data.preferred_username || '',
      realm_roles: data.realm_roles || [],
    };
  } catch {
    return null;
  }
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.location.hash = '';
  sessionStorage.removeItem('access_token');
}

export function storeToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('access_token', token);
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('access_token');
}

export function getKeycloakLogoutUrl(): string {
  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'myawesomeapp';
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
  return `${keycloakUrl}/realms/${realm}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent(frontendUrl)}`;
}
```

- [ ] **Step 4: Update dashboard page for Keycloak**

Replace `services/frontend/src/app/dashboard/page.tsx` with:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getStoredToken, fetchUserInfo, clearToken, getKeycloakLogoutUrl, type UserInfo } from '@/lib/auth';

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [killStatus, setKillStatus] = useState<string>('');
  const [authHealthy, setAuthHealthy] = useState<boolean>(true);

  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
  const liveopsUrl = process.env.NEXT_PUBLIC_LIVEOPS_URL || 'http://localhost:4000';

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      window.location.href = '/';
      return;
    }
    fetchUserInfo(token).then((u) => {
      if (u) setUser(u);
      else clearToken();
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${keycloakUrl}/health/ready`);
        setAuthHealthy(res.ok);
      } catch {
        setAuthHealthy(false);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [keycloakUrl]);

  const handleKillAuth = async () => {
    setKillStatus('Killing auth service...');
    try {
      const res = await fetch(`${liveopsUrl}/api/kill-auth`, { method: 'POST' });
      const data = await res.json();
      setKillStatus(data.message || 'Auth service kill signal sent');
    } catch {
      setKillStatus('Failed to reach LiveOps backend. Is it running?');
    }
  };

  const handleLogout = () => {
    clearToken();
    window.location.href = getKeycloakLogoutUrl();
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Dashboard</h1>
        <button
          onClick={handleLogout}
          style={{ padding: '0.5rem 1rem', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>

      {user && (
        <div style={{ background: '#1a1a2e', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem' }}>Welcome, {user.name}</h2>
          <p style={{ color: '#888', margin: 0 }}>{user.email} &middot; {user.preferred_username}</p>
        </div>
      )}

      <div style={{ background: '#1a1a2e', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3>Service Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            width: '12px', height: '12px', borderRadius: '50%',
            background: authHealthy ? '#48bb78' : '#f56565',
            display: 'inline-block',
          }} />
          <span>Keycloak Identity Provider — {authHealthy ? 'Healthy' : 'Down'}</span>
        </div>
      </div>

      <div style={{ background: '#2d1b1b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #f56565' }}>
        <h3 style={{ color: '#f56565', marginTop: 0 }}>Danger Zone</h3>
        <p>Click below to kill the Keycloak pod. This will trigger the LiveOps incident response pipeline.</p>
        <button
          onClick={handleKillAuth}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#f56565',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '1rem',
          }}
        >
          Kill Keycloak
        </button>
        {killStatus && <p style={{ marginTop: '1rem', color: '#fc8181' }}>{killStatus}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify frontend builds**

Run: `cd services/frontend && npx next build`

Expected: Build succeeds with no errors

- [ ] **Step 6: Commit frontend changes**

```bash
git add -A
git commit -m "feat: update frontend for Keycloak — landing page with login/register buttons, Keycloak token handling"
```

---

### Task 5: Update Frontend Deployment Env Vars

**Files:**
- Modify: `k8s/demo-frontend-deployment.yaml`

- [ ] **Step 1: Update frontend deployment env vars**

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
              value: "http://keycloak:8080"
            - name: NEXT_PUBLIC_KEYCLOAK_REALM
              value: "myawesomeapp"
            - name: NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
              value: "myawesomeapp-frontend"
            - name: NEXT_PUBLIC_REDIRECT_URI
              value: "http://demo-frontend/dashboard"
            - name: NEXT_PUBLIC_FRONTEND_URL
              value: "http://demo-frontend"
            - name: NEXT_PUBLIC_LIVEOPS_URL
              value: "http://liveops-backend:4000"
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
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
```

- [ ] **Step 2: Commit deployment update**

```bash
git add k8s/demo-frontend-deployment.yaml
git commit -m "feat: update frontend deployment env vars for Keycloak, update health monitor target"
```

---

### Task 6: Update Health Monitor for Keycloak

**Files:**
- Modify: `scripts/health-monitor.ts`

- [ ] **Step 1: Update health monitor to poll Keycloak health endpoint**

Replace `scripts/health-monitor.ts` with:

```typescript
const AUTH_HEALTH_URL = process.env.AUTH_HEALTH_URL || 'http://keycloak:8080/health/ready';
const LIVEOPS_EVENTS_URL = process.env.LIVEOPS_EVENTS_URL || 'http://liveops-backend:4000/api/events';
const POLL_INTERVAL_MS = 5000;
const FAILURE_THRESHOLD = 3;

let consecutiveFailures = 0;
let consecutiveSuccesses = 0;
let isDown = false;
let lastHealthyTime: string | null = null;

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(AUTH_HEALTH_URL, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function pushEvent(event: object): Promise<void> {
  try {
    await fetch(LIVEOPS_EVENTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch (err) {
    console.error('Failed to push event to LiveOps:', err);
  }
}

async function monitor(): Promise<void> {
  console.log(`Health monitor started. Polling ${AUTH_HEALTH_URL} every ${POLL_INTERVAL_MS}ms`);

  while (true) {
    const healthy = await checkHealth();

    if (healthy) {
      consecutiveFailures = 0;
      consecutiveSuccesses++;
      lastHealthyTime = new Date().toISOString();

      if (isDown && consecutiveSuccesses >= FAILURE_THRESHOLD) {
        isDown = false;
        consecutiveSuccesses = 0;
        console.log('Keycloak recovered!');
        await pushEvent({
          type: 'recovery',
          service: 'keycloak',
          status: 'healthy',
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      consecutiveSuccesses = 0;
      consecutiveFailures++;

      if (!isDown && consecutiveFailures >= FAILURE_THRESHOLD) {
        isDown = true;
        console.log('Keycloak is down!');
        await pushEvent({
          type: 'incident',
          service: 'keycloak',
          status: 'down',
          errorRate: '100%',
          impactedUsers: 15,
          timestamp: new Date().toISOString(),
          lastHealthy: lastHealthyTime || new Date().toISOString(),
        });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

monitor().catch(console.error);
```

- [ ] **Step 2: Commit health monitor update**

```bash
git add scripts/health-monitor.ts
git commit -m "feat: update health monitor to poll Keycloak health endpoint"
```

---

### Task 7: Update Frontend Dockerfile for Keycloak Env Vars

**Files:**
- Modify: `services/frontend/Dockerfile`

- [ ] **Step 1: Update Dockerfile env vars**

Replace `services/frontend/Dockerfile` with:

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ENV NEXT_PUBLIC_KEYCLOAK_URL=http://keycloak:8080
ENV NEXT_PUBLIC_KEYCLOAK_REALM=myawesomeapp
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=myawesomeapp-frontend
ENV NEXT_PUBLIC_REDIRECT_URI=http://demo-frontend/dashboard
ENV NEXT_PUBLIC_FRONTEND_URL=http://demo-frontend
ENV NEXT_PUBLIC_LIVEOPS_URL=http://liveops-backend:4000

RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_PUBLIC_KEYCLOAK_URL=http://keycloak:8080
ENV NEXT_PUBLIC_KEYCLOAK_REALM=myawesomeapp
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=myawesomeapp-frontend
ENV NEXT_PUBLIC_REDIRECT_URI=http://demo-frontend/dashboard
ENV NEXT_PUBLIC_FRONTEND_URL=http://demo-frontend
ENV NEXT_PUBLIC_LIVEOPS_URL=http://liveops-backend:4000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
```

- [ ] **Step 2: Commit Dockerfile update**

```bash
git add services/frontend/Dockerfile
git commit -m "feat: update frontend Dockerfile with Keycloak environment variables"
```

---

### Task 8: Add Keycloak CI/CD Workflow and Update ArgoCD Application

**Files:**
- Delete: `.github/workflows/auth-service.yml` (already deleted in Task 1)
- Create: `.github/workflows/keycloak.yml`
- Modify: `k8s/argocd-application.yaml`

- [ ] **Step 1: Create Keycloak CI/CD workflow**

Create `.github/workflows/keycloak.yml`:

```yaml
name: Build & Push Keycloak

on:
  push:
    branches: [main]
    paths:
      - 'keycloak/**'
      - '.github/workflows/keycloak.yml'

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./keycloak
          push: true
          tags: |
            ghcr.io/codedrifter-mx/myawesomeapp/keycloak:latest
            ghcr.io/codedrifter-mx/myawesomeapp/keycloak:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 2: Update ArgoCD application manifest**

The k8s directory now has Keycloak manifests instead of auth-service manifests. ArgoCD will auto-discover all manifests in the k8s/ directory. No changes needed to argocd-application.yaml since it points at the k8s/ directory.

- [ ] **Step 3: Update the frontend CI/CD workflow**

The frontend workflow is fine as-is since it builds from `services/frontend/`. No changes needed.

- [ ] **Step 4: Commit Keycloak CI/CD workflow**

```bash
git add .github/workflows/keycloak.yml
git commit -m "feat: add GitHub Actions CI/CD workflow for Keycloak"
```

---

### Task 9: Update Local Development Instructions

**Files:**
- Modify: `LOCAL_DEV.md`
- Modify: `start.bat`
- Modify: `start.ps1`

- [ ] **Step 1: Update LOCAL_DEV.md**

Add a "Keycloak Setup" section after the Prerequisites section and update the Quick Start to include Keycloak. The full updated file should document:

1. Running Keycloak locally via Docker: `docker run -d -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin -v $(pwd)/keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json quay.io/keycloak/keycloak:26.0 start-dev --import-realm`
2. Accessing Keycloak admin console at http://localhost:8080/admin (admin/admin)
3. Demo user credentials: demo/demo
4. Updated environment variables for the frontend (NEXT_PUBLIC_KEYCLOAK_URL, etc.)
5. Updated health monitor URL (Keycloak:8080/health/ready)

- [ ] **Step 2: Update start.bat**

Add Keycloak Docker startup to `start.bat`:

```bat
@echo off
echo ============================================
echo   myAwesomeApp - Local Development Start
echo ============================================
echo.

echo Starting Keycloak on port 8080...
docker run -d --name keycloak -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin -v "%~dp0keycloak\realm-export.json:/opt/keycloak/data/import/realm-export.json" quay.io/keycloak/keycloak:26.0 start-dev --import-realm

echo Waiting for Keycloak to start (30 seconds)...
timeout /t 30 /nobreak >nul

echo Starting Frontend on port 3000...
start "Frontend" cmd /k "cd /d %~dp0services\frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo Starting Health Monitor...
start "Health Monitor" cmd /k "cd /d %~dp0scripts && set AUTH_HEALTH_URL=http://localhost:8080/health/ready && set LIVEOPS_EVENTS_URL=http://localhost:4000/api/events && npx tsx health-monitor.ts"

echo.
echo ============================================
echo   All services starting!
echo.
echo   Keycloak:        http://localhost:8080
echo   Keycloak Admin:  http://localhost:8080/admin (admin/admin)
echo   Frontend:        http://localhost:3000
echo   Health Monitor:  polling Keycloak health
echo.
echo   Demo credentials: demo / demo
echo.
echo   Open http://localhost:3000 in your browser
echo.
echo   Close the terminal windows to stop
echo   Run stop.bat to stop Keycloak container
echo ============================================
pause
```

- [ ] **Step 3: Update start.ps1**

Add Keycloak Docker startup to `start.ps1`:

```powershell
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  myAwesomeApp - Local Development Start" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Keycloak on port 8080..." -ForegroundColor Green
docker run -d --name keycloak -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin -v "${rootDir}\keycloak\realm-export.json:/opt/keycloak/data/import/realm-export.json" quay.io/keycloak/keycloak:26.0 start-dev --import-realm

Write-Host "Waiting for Keycloak to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "Installing dependencies..." -ForegroundColor Yellow

Push-Location "$rootDir\services\frontend"
if (-not (Test-Path "node_modules")) { npm install } else { Write-Host "  frontend: dependencies OK" }
Pop-Location

Push-Location "$rootDir\scripts"
if (-not (Test-Path "node_modules")) { npm install } else { Write-Host "  health-monitor: dependencies OK" }
Pop-Location

Write-Host ""
Write-Host "Starting Frontend on port 3000..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$rootDir\services\frontend`" && npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 5

Write-Host "Starting Health Monitor..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$rootDir\scripts`" && set AUTH_HEALTH_URL=http://localhost:8080/health/ready && set LIVEOPS_EVENTS_URL=http://localhost:4000/api/events && npx tsx health-monitor.ts" -WindowStyle Normal

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  All services starting!" -ForegroundColor Green
Write-Host ""
Write-Host "  Keycloak:        http://localhost:8080" -ForegroundColor White
Write-Host "  Keycloak Admin:  http://localhost:8080/admin (admin/admin)" -ForegroundColor White
Write-Host "  Frontend:        http://localhost:3000" -ForegroundColor White
Write-Host "  Health Monitor:  polling Keycloak health" -ForegroundColor White
Write-Host ""
Write-Host "  Demo credentials: demo / demo" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Open http://localhost:3000 in your browser" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Run stop.bat to stop all services" -ForegroundColor DarkGray
Write-Host "============================================" -ForegroundColor Cyan
```

- [ ] **Step 4: Update stop.bat**

Update `stop.bat` to also stop Keycloak:

```bat
@echo off
echo Stopping all myAwesomeApp services...
taskkill /fi "WINDOWTITLE eq Frontend*" >nul 2>&1
taskkill /fi "WINDOWTITLE eq Health Monitor*" >nul 2>&1
docker stop keycloak >nul 2>&1
docker rm keycloak >nul 2>&1
echo All services stopped.
pause
```

- [ ] **Step 5: Commit updated scripts**

```bash
git add LOCAL_DEV.md start.bat start.ps1 stop.bat
git commit -m "docs: update local dev instructions and start/stop scripts for Keycloak"
```

---

### Task 10: Test End-to-End Locally

- [ ] **Step 1: Stop any running services**

Close all existing terminal windows running the old auth service, frontend, and health monitor. Run `stop.bat` to clean up.

- [ ] **Step 2: Start Keycloak via Docker**

```powershell
docker run -d --name keycloak -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin -v "C:\Users\Kazuk\projects\myAwesomeApp\keycloak\realm-export.json:/opt/keycloak/data/import/realm-export.json" quay.io/keycloak/keycloak:26.0 start-dev --import-realm
```

Wait ~30 seconds for Keycloak to start up. Verify: open http://localhost:8080/admin and log in with admin/admin.

- [ ] **Step 3: Verify Keycloak health**

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/health/ready"
```

Expected: `{ "status": "UP" }` or similar OK response.

- [ ] **Step 4: Start the frontend**

```powershell
cd C:\Users\Kazuk\projects\myAwesomeApp\services\frontend
npm run dev
```

- [ ] **Step 5: Test the full OAuth flow**

1. Open http://localhost:3000
2. You should see "myAwesomeApp" landing page with "Sign In" and "Create Account" buttons
3. Click "Sign In" — should redirect to Keycloak login page
4. Log in with demo/demo
5. Should redirect back to http://localhost:3000/dashboard#access_token=...&token_type=...
6. Dashboard should show "Welcome, Demo User" and Keycloak health status

- [ ] **Step 6: Test Keycloak registration**

1. Go to http://localhost:3000
2. Click "Create Account" — should redirect to Keycloak registration page
3. Register a new user
4. Should redirect back to dashboard with the new user's token

- [ ] **Step 7: Commit any fixes found during testing**

```bash
git add -A
git commit -m "fix: address issues found during local testing"
```

---

### Task 11: Push and Verify

- [ ] **Step 1: Push all changes to remote**

```bash
git push origin feat/demo-app-implementation
```

- [ ] **Step 2: Verify the GitHub Actions workflow for Keycloak will trigger**

Check at https://github.com/codedrifter-mx/myAwesomeApp/actions that the keycloak workflow is listed.

- [ ] **Step 3: Merge to main when ready**

After verifying, merge the feature branch:
```bash
git checkout main
git merge feat/demo-app-implementation
git push origin main
```