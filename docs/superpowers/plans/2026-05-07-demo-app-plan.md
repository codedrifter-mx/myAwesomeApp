# myAwesomeApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Demo App — a Next.js frontend + Express.js auth microservice + health monitor sidecar — containerized and deployed via ArgoCD on k3s, with CI/CD through GitHub Actions.

**Architecture:** Two services in a monorepo. Next.js frontend serves a landing page with OAuth implicit flow login and a "kill auth service" button. Express.js auth microservice provides OAuth2 implicit flow endpoints. A health monitor sidecar polls the auth service and pushes SSE events to LiveOps on failure. Both are containerized with Docker, pushed to ghcr.io via GitHub Actions, and auto-deployed by ArgoCD to k3s on Oracle Cloud.

**Tech Stack:** Next.js 14 (App Router), Express.js, TypeScript, Docker, k3s, ArgoCD, GitHub Actions, ghcr.io

---

## File Structure

```
myAwesomeApp/
├── .github/
│   └── workflows/
│       ├── demo-frontend.yml       # CI/CD for Next.js frontend
│       └── auth-service.yml        # CI/CD for Express auth service
├── k8s/
│   ├── namespace.yaml             # demo-app namespace
│   ├── demo-frontend-deployment.yaml
│   ├── demo-frontend-service.yaml
│   ├── demo-frontend-ingress.yaml
│   ├── auth-service-deployment.yaml
│   ├── auth-service-service.yaml
│   └── auth-service-ingress.yaml
├── services/
│   ├── frontend/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.js
│   │   └── src/
│   │       └── app/
│   │           ├── layout.tsx
│   │           ├── page.tsx         # landing page
│   │           ├── login/
│   │           │   └── page.tsx     # OAuth login redirect handler
│   │           └── dashboard/
│   │               └── page.tsx     # logged-in dashboard with kill button
│   └── auth/
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts            # Express server entry
│           ├── routes/
│           │   ├── authorize.ts     # OAuth2 /authorize endpoint
│           │   ├── token.ts         # OAuth2 /token endpoint
│           │   ├── userinfo.ts      # /userinfo endpoint
│           │   └── health.ts        # /health endpoint
│           └── middleware/
│               └── jwt.ts          # JWT signing/verification
├── scripts/
│   └── health-monitor.ts          # Sidecar: polls auth /health, pushes SSE to LiveOps
├── docs/
│   ├── specs/
│   │   ├── 2026-05-07-demo-app-design.md
│   │   └── 2026-05-07-infrastructure-setup.md
│   └── superpowers/
│       └── plans/
│           └── 2026-05-07-demo-app-plan.md
└── README.md
```

---

### Task 1: Initialize Project Structure and Auth Service

**Files:**
- Create: `services/auth/package.json`
- Create: `services/auth/tsconfig.json`
- Create: `services/auth/src/index.ts`
- Create: `services/auth/src/routes/authorize.ts`
- Create: `services/auth/src/routes/token.ts`
- Create: `services/auth/src/routes/userinfo.ts`
- Create: `services/auth/src/routes/health.ts`
- Create: `services/auth/src/middleware/jwt.ts`

- [ ] **Step 1: Create auth service directory and package.json**

```json
{
  "name": "auth-service",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/cors": "^2.8.17",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json for auth service**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create JWT middleware**

Create `services/auth/src/middleware/jwt.ts`:

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hackathon-demo-secret-change-in-prod';
const JWT_EXPIRES_IN = '1h';

export function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): jwt.JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'string') return null;
    return decoded as jwt.JwtPayload;
  } catch {
    return null;
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}
```

- [ ] **Step 4: Create authorize route**

Create `services/auth/src/routes/authorize.ts`:

```typescript
import { Request, Response, Router } from 'express';
import { signToken } from '../middleware/jwt';

const router = Router();

const DEMO_USER = {
  id: 'usr_demo_001',
  email: 'demo@myawesomeapp.dev',
  name: 'Demo User',
  role: 'admin',
};

router.get('/authorize', (req: Request, res: Response) => {
  const redirectUri = req.query.redirect_uri as string;
  const state = req.query.state as string;

  if (!redirectUri) {
    res.status(400).json({ error: 'redirect_uri is required' });
    return;
  }

  const token = signToken({
    sub: DEMO_USER.id,
    email: DEMO_USER.email,
    name: DEMO_USER.name,
    role: DEMO_USER.role,
  });

  const separator = redirectUri.includes('#') ? '&' : '#';
  const redirectUrl = `${redirectUri}${separator}access_token=${encodeURIComponent(token)}&token_type=bearer&expires_in=3600&state=${encodeURIComponent(state || '')}`;

  res.redirect(302, redirectUrl);
});

export default router;
```

- [ ] **Step 5: Create token route**

Create `services/auth/src/routes/token.ts`:

```typescript
import { Request, Response, Router } from 'express';

const router = Router();

router.post('/token', (req: Request, res: Response) => {
  res.status(400).json({
    error: 'unsupported_grant_type',
    error_description: 'Implicit flow returns token in the authorize redirect. This endpoint is provided for API discovery only.',
  });
});

export default router;
```

- [ ] **Step 6: Create userinfo route**

Create `services/auth/src/routes/userinfo.ts`:

```typescript
import { Request, Response, Router } from 'express';
import { verifyToken, extractBearerToken } from '../middleware/jwt';

const router = Router();

router.get('/userinfo', (req: Request, res: Response) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({ error: 'unauthorized', error_description: 'Missing bearer token' });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'invalid_token', error_description: 'Token is invalid or expired' });
    return;
  }

  res.json({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  });
});

export default router;
```

- [ ] **Step 7: Create health route**

Create `services/auth/src/routes/health.ts`:

```typescript
import { Request, Response, Router } from 'express';

const router = Router();
const startTime = Date.now();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    service: 'auth-microservice',
    timestamp: new Date().toISOString(),
  });
});

export default router;
```

- [ ] **Step 8: Create Express server entry point**

Create `services/auth/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import authorizeRouter from './routes/authorize';
import tokenRouter from './routes/token';
import userinfoRouter from './routes/userinfo';
import healthRouter from './routes/health';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.use(authorizeRouter);
app.use(tokenRouter);
app.use(userinfoRouter);
app.use(healthRouter);

app.listen(PORT, () => {
  console.log(`Auth microservice running on port ${PORT}`);
});
```

- [ ] **Step 9: Install auth service dependencies**

Run: `cd services/auth && npm install`

- [ ] **Step 10: Verify auth service compiles**

Run: `cd services/auth && npx tsc --noEmit`

Expected: No errors

- [ ] **Step 11: Commit auth service**

```bash
git add services/auth/
git commit -m "feat: add auth microservice with OAuth2 implicit flow endpoints"
```

---

### Task 2: Auth Service Dockerfile and Local Test

**Files:**
- Create: `services/auth/Dockerfile`

- [ ] **Step 1: Create Dockerfile for auth service**

Create `services/auth/Dockerfile`:

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Build and test auth service locally**

Run: `cd services/auth && docker build -t auth-service:local . && docker run -d -p 3001:3001 --name auth-test auth-service:local`

Then verify:
```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","uptime":...,"service":"auth-microservice","timestamp":"..."}

curl "http://localhost:3001/authorize?redirect_uri=http://localhost:3000/dashboard"
# Expected: redirect to http://localhost:3000/dashboard#access_token=...&token_type=bearer&expires_in=3600&state=
```

- [ ] **Step 3: Clean up test container**

Run: `docker stop auth-test && docker rm auth-test`

- [ ] **Step 4: Commit Dockerfile**

```bash
git add services/auth/Dockerfile
git commit -m "feat: add Dockerfile for auth service"
```

---

### Task 3: Initialize Next.js Frontend

**Files:**
- Create: `services/frontend/package.json`
- Create: `services/frontend/tsconfig.json`
- Create: `services/frontend/next.config.js`
- Create: `services/frontend/src/app/layout.tsx`
- Create: `services/frontend/src/app/page.tsx`

- [ ] **Step 1: Create frontend directory and package.json**

Create `services/frontend/package.json`:

```json
{
  "name": "demo-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json for frontend**

Create `services/frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.js**

Create `services/frontend/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

module.exports = nextConfig;
```

- [ ] **Step 4: Create layout.tsx**

Create `services/frontend/src/app/layout.tsx`:

```tsx
export const metadata = {
  title: 'myAwesomeApp',
  description: 'Demo app for Generative UI Hackathon',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif', background: '#0a0a0a', color: '#fff' }}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Create landing page**

Create `services/frontend/src/app/page.tsx`:

```tsx
export default function HomePage() {
  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>myAwesomeApp</h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>Demo application for LiveOps incident response</p>
      <a
        href={`${authUrl}/authorize?redirect_uri=${encodeURIComponent('http://localhost:3000/dashboard')}&state=random-state`}
        style={{
          padding: '0.75rem 2rem',
          background: '#38b2ac',
          color: '#fff',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Sign In with OAuth
      </a>
    </div>
  );
}
```

- [ ] **Step 6: Install frontend dependencies**

Run: `cd services/frontend && npm install`

- [ ] **Step 7: Verify frontend builds**

Run: `cd services/frontend && npx next build`

Expected: Build succeeds with no errors

- [ ] **Step 8: Commit frontend scaffold**

```bash
git add services/frontend/
git commit -m "feat: add Next.js frontend with landing page"
```

---

### Task 4: Frontend Dashboard with OAuth and Kill Button

**Files:**
- Create: `services/frontend/src/app/login/page.tsx`
- Create: `services/frontend/src/app/dashboard/page.tsx`
- Create: `services/frontend/src/lib/auth.ts`

- [ ] **Step 1: Create auth utility**

Create `services/frontend/src/lib/auth.ts`:

```typescript
export interface UserInfo {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export function getTokenFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get('access_token');
}

export async function fetchUserInfo(token: string, authUrl?: string): Promise<UserInfo | null> {
  const baseUrl = authUrl || process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001';
  try {
    const res = await fetch(`${baseUrl}/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
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
```

- [ ] **Step 2: Create login callback page**

Create `services/frontend/src/app/login/page.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { getTokenFromHash, storeToken, fetchUserInfo } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getTokenFromHash();
    if (token) {
      storeToken(token);
      router.push('/dashboard');
    } else {
      router.push('/');
    }
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p>Processing login...</p>
    </div>
  );
}
```

- [ ] **Step 3: Create dashboard page with kill button**

Create `services/frontend/src/app/dashboard/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getStoredToken, fetchUserInfo, clearToken, type UserInfo } from '@/lib/auth';

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [killStatus, setKillStatus] = useState<string>('');
  const [authHealthy, setAuthHealthy] = useState<boolean>(true);

  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001';
  const liveopsUrl = process.env.NEXT_PUBLIC_LIVEOPS_URL || 'http://localhost:4000';

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      window.location.href = '/';
      return;
    }
    fetchUserInfo(token, authUrl).then((u) => {
      if (u) setUser(u);
      else clearToken();
    });
  }, [authUrl]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${authUrl}/health`);
        setAuthHealthy(res.ok);
      } catch {
        setAuthHealthy(false);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [authUrl]);

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

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Dashboard</h1>
        <button
          onClick={() => { clearToken(); window.location.href = '/'; }}
          style={{ padding: '0.5rem 1rem', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>

      {user && (
        <div style={{ background: '#1a1a2e', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem' }}>Welcome, {user.name}</h2>
          <p style={{ color: '#888', margin: 0 }}>{user.email} &middot; {user.role}</p>
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
          <span>Auth Microservice — {authHealthy ? 'Healthy' : 'Down'}</span>
        </div>
      </div>

      <div style={{ background: '#2d1b1b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #f56565' }}>
        <h3 style={{ color: '#f56565', marginTop: 0 }}>Danger Zone</h3>
        <p>Click below to kill the auth service pod. This will trigger the LiveOps incident response pipeline.</p>
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
          Kill Auth Service
        </button>
        {killStatus && <p style={{ marginTop: '1rem', color: '#fc8181' }}>{killStatus}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify frontend builds with new pages**

Run: `cd services/frontend && npx next build`

Expected: Build succeeds with no errors

- [ ] **Step 5: Commit dashboard and auth**

```bash
git add services/frontend/src/
git commit -m "feat: add dashboard page with auth status and kill button"
```

---

### Task 5: Frontend Dockerfile

**Files:**
- Create: `services/frontend/Dockerfile`

- [ ] **Step 1: Create Dockerfile for frontend**

Create `services/frontend/Dockerfile`:

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ENV NEXT_PUBLIC_AUTH_URL=http://auth-service:3001
ENV NEXT_PUBLIC_LIVEOPS_URL=http://liveops-backend:4000

RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_PUBLIC_AUTH_URL=http://auth-service:3001
ENV NEXT_PUBLIC_LIVEOPS_URL=http://liveops-backend:4000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
```

- [ ] **Step 2: Commit frontend Dockerfile**

```bash
git add services/frontend/Dockerfile
git commit -m "feat: add Dockerfile for frontend with standalone build"
```

---

### Task 6: Health Monitor Sidecar Script

**Files:**
- Create: `scripts/health-monitor.ts`

The health monitor runs as a sidecar container. It polls the auth service `/health` endpoint and pushes SSE events to the LiveOps backend when the service goes down or recovers.

- [ ] **Step 1: Create health monitor script**

Create `scripts/health-monitor.ts`:

```typescript
const AUTH_HEALTH_URL = process.env.AUTH_HEALTH_URL || 'http://auth-service:3001/health';
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
        console.log('Auth service recovered!');
        await pushEvent({
          type: 'recovery',
          service: 'auth-microservice',
          status: 'healthy',
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      consecutiveSuccesses = 0;
      consecutiveFailures++;

      if (!isDown && consecutiveFailures >= FAILURE_THRESHOLD) {
        isDown = true;
        console.log('Auth service is down!');
        await pushEvent({
          type: 'incident',
          service: 'auth-microservice',
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

- [ ] **Step 2: Commit health monitor**

```bash
git add scripts/health-monitor.ts
git commit -m "feat: add health monitor sidecar that polls auth service and pushes SSE to LiveOps"
```

---

### Task 7: Health Monitor Dockerfile

**Files:**
- Create: `scripts/Dockerfile`

- [ ] **Step 1: Create Dockerfile for health monitor**

Create `scripts/Dockerfile`:

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY health-monitor.ts ./

ENV NODE_ENV=production

CMD ["npx", "tsx", "health-monitor.ts"]
```

We also need a minimal package.json for the health monitor. Create `scripts/package.json`:

```json
{
  "name": "health-monitor",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 2: Commit health monitor Dockerfile and package.json**

```bash
git add scripts/Dockerfile scripts/package.json
git commit -m "feat: add Dockerfile for health monitor sidecar"
```

---

### Task 8: Kubernetes Manifests

**Files:**
- Create: `k8s/namespace.yaml`
- Create: `k8s/auth-service-deployment.yaml`
- Create: `k8s/auth-service-service.yaml`
- Create: `k8s/auth-service-ingress.yaml`
- Create: `k8s/demo-frontend-deployment.yaml`
- Create: `k8s/demo-frontend-service.yaml`
- Create: `k8s/demo-frontend-ingress.yaml`

- [ ] **Step 1: Create namespace**

Create `k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo-app
  labels:
    app: demo-app
```

- [ ] **Step 2: Create auth service deployment**

Create `k8s/auth-service-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: demo-app
  labels:
    app: auth-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
        - name: auth-service
          image: ghcr.io/codedrifter-mx/myawesomeapp/auth-service:latest
          ports:
            - containerPort: 3001
          env:
            - name: PORT
              value: "3001"
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: demo-app-secrets
                  key: jwt-secret
            - name: FRONTEND_URL
              value: "http://demo-frontend"
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 15
            periodSeconds: 20
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
```

- [ ] **Step 3: Create auth service service**

Create `k8s/auth-service-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: demo-app
spec:
  selector:
    app: auth-service
  ports:
    - port: 3001
      targetPort: 3001
  type: ClusterIP
```

- [ ] **Step 4: Create auth service ingress**

Create `k8s/auth-service-ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: auth-service-ingress
  namespace: demo-app
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  rules:
    - http:
        paths:
          - path: /authorize
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 3001
          - path: /token
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 3001
          - path: /userinfo
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 3001
          - path: /health
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 3001
```

- [ ] **Step 5: Create demo frontend deployment (with health monitor sidecar)**

Create `k8s/demo-frontend-deployment.yaml`:

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
            - name: NEXT_PUBLIC_AUTH_URL
              value: "http://auth-service:3001"
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
              value: "http://auth-service:3001/health"
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

- [ ] **Step 6: Create demo frontend service**

Create `k8s/demo-frontend-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: demo-frontend
  namespace: demo-app
spec:
  selector:
    app: demo-frontend
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

- [ ] **Step 7: Create demo frontend ingress**

Create `k8s/demo-frontend-ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: demo-frontend-ingress
  namespace: demo-app
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: demo-frontend
                port:
                  number: 80
```

- [ ] **Step 8: Create demo-app-secrets placeholder**

Create `k8s/secrets.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: demo-app-secrets
  namespace: demo-app
type: Opaque
stringData:
  jwt-secret: "hackathon-demo-jwt-secret-change-in-prod"
```

- [ ] **Step 9: Commit k8s manifests**

```bash
git add k8s/
git commit -m "feat: add Kubernetes manifests for demo-app namespace, auth service, frontend, and health monitor sidecar"
```

---

### Task 9: GitHub Actions CI/CD Workflows

**Files:**
- Create: `.github/workflows/demo-frontend.yml`
- Create: `.github/workflows/auth-service.yml`

- [ ] **Step 1: Create frontend CI/CD workflow**

Create `.github/workflows/demo-frontend.yml`:

```yaml
name: Build & Push Demo Frontend

on:
  push:
    branches: [main]
    paths:
      - 'services/frontend/**'
      - '.github/workflows/demo-frontend.yml'

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
          context: ./services/frontend
          push: true
          tags: |
            ghcr.io/codedrifter-mx/myawesomeapp/demo-frontend:latest
            ghcr.io/codedrifter-mx/myawesomeapp/demo-frontend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 2: Create auth service CI/CD workflow**

Create `.github/workflows/auth-service.yml`:

```yaml
name: Build & Push Auth Service

on:
  push:
    branches: [main]
    paths:
      - 'services/auth/**'
      - '.github/workflows/auth-service.yml'

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
          context: ./services/auth
          push: true
          tags: |
            ghcr.io/codedrifter-mx/myawesomeapp/auth-service:latest
            ghcr.io/codedrifter-mx/myawesomeapp/auth-service:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 3: Create health monitor CI/CD workflow**

Create `.github/workflows/health-monitor.yml`:

```yaml
name: Build & Push Health Monitor

on:
  push:
    branches: [main]
    paths:
      - 'scripts/health-monitor.ts'
      - 'scripts/Dockerfile'
      - 'scripts/package.json'
      - '.github/workflows/health-monitor.yml'

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
          context: ./scripts
          push: true
          tags: |
            ghcr.io/codedrifter-mx/myawesomeapp/health-monitor:latest
            ghcr.io/codedrifter-mx/myawesomeapp/health-monitor:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 4: Commit GitHub Actions workflows**

```bash
git add .github/
git commit -m "feat: add GitHub Actions CI/CD workflows for all three services"
```

---

### Task 10: ArgoCD Application Manifest and README

**Files:**
- Create: `k8s/argocd-application.yaml`
- Create: `README.md`

- [ ] **Step 1: Create ArgoCD Application manifest**

Create `k8s/argocd-application.yaml`:

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
    syncOptions:
      - CreateNamespace=true
```

- [ ] **Step 2: Create README.md**

Create `README.md`:

```markdown
# myAwesomeApp

Demo application for the Generative UI Global Hackathon: Agentic Interfaces (May 9, 2026).

## What It Does

A Next.js frontend + Express.js auth microservice deployed on k3s with ArgoCD. During the hackathon demo, the auth service is intentionally killed, triggering the LiveOps dashboard's agentic incident response.

See [design spec](docs/specs/2026-05-07-demo-app-design.md) for full details.

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js landing page with OAuth login and dashboard |
| Auth Service | 3001 | OAuth2 implicit flow authorization server |
| Health Monitor | — | Sidecar that monitors auth service and pushes SSE events to LiveOps |

## Local Development

### Auth Service

```bash
cd services/auth
npm install
npm run dev
```

### Frontend

```bash
cd services/frontend
npm install
npm run dev
```

### Health Monitor

```bash
cd scripts
npm install
AUTH_HEALTH_URL=http://localhost:3001/health LIVEOPS_EVENTS_URL=http://localhost:4000/api/events npx tsx health-monitor.ts
```

## Deployment

Deployed via ArgoCD to k3s on Oracle Cloud. Push to `main` triggers GitHub Actions → builds Docker images → pushes to ghcr.io → ArgoCD auto-deploys.

See [infrastructure setup](docs/specs/2026-05-07-infrastructure-setup.md) for full setup instructions.
```

- [ ] **Step 3: Commit ArgoCD application and README**

```bash
git add k8s/argocd-application.yaml README.md
git commit -m "feat: add ArgoCD application manifest and README"
```

---

### Task 11: Push and Verify CI/CD

- [ ] **Step 1: Push all commits to GitHub**

Run: `git push origin main`

- [ ] **Step 2: Verify GitHub Actions workflows trigger**

Go to https://github.com/codedrifter-mx/myAwesomeApp/actions and confirm all three workflows are running.

- [ ] **Step 3: Wait for all images to build and push to ghcr.io**

Check at https://github.com/codedrifter-mx?tab=packages that the following packages exist:
- `myawesomeapp/demo-frontend`
- `myawesomeapp/auth-service`
- `myawesomeapp/health-monitor`

- [ ] **Step 4: (Pre-hackathon) Deploy to Oracle Cloud k3s**

Follow the infrastructure setup guide at `docs/specs/2026-05-07-infrastructure-setup.md`:
1. Set up Oracle Cloud ARM instance
2. Install k3s
3. Install ArgoCD
4. Connect ArgoCD to the GitHub repo
5. Apply the ArgoCD application manifest
6. Verify all pods are running: `kubectl get pods -n demo-app`

- [ ] **Step 5: (Pre-hackathon) Test the demo flow**

1. Visit the demo frontend URL
2. Click "Sign In with OAuth" — should redirect and log in
3. Go to ArgoCD UI — verify auth-service pod is healthy
4. Click "Kill Auth Service" on the dashboard — the pod should be deleted
5. ArgoCD should auto-heal by recreating the pod (selfHeal: true)
6. Health monitor should push an incident event to LiveOps backend

---

### Task 12: Pre-Hackathon Checklist

This task covers the manual setup steps that must be completed before the hackathon. Each step references the infrastructure setup guide.

- [ ] **Step 1: Oracle Cloud account created, ARM instance provisioned**

Follow `docs/specs/2026-05-07-infrastructure-setup.md` → Oracle Cloud Setup section.
Choose us-phoenix-1 region, Ampere A1 shape (4 OCPU, 24GB RAM), Ubuntu 22.04.

- [ ] **Step 2: SSH access confirmed**

`ssh -i <private-key> ubuntu@<public-ip>` should work.

- [ ] **Step 3: k3s installed and verified**

```bash
curl -sfL https://get.k3s.io | sh -
sudo systemctl status k3s
sudo k3s kubectl get nodes
```

- [ ] **Step 4: ArgoCD installed and accessible via browser**

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'
```

Get the external IP from `kubectl get svc argocd-server -n argocd`.
Get the admin password from `kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d`.

- [ ] **Step 5: ArgoCD connected to GitHub repo**

In ArgoCD UI: Settings → Repositories → Connect Repo → `https://github.com/codedrifter-mx/myAwesomeApp.git`

- [ ] **Step 6: Security groups configured**

In Oracle Cloud: VCN → Security Lists → add ingress rules for ports 80, 443, 6443, 30000-32767, 8080, 4000.

- [ ] **Step 7: All pods running**

```bash
kubectl get pods -n demo-app
kubectl get pods -n argocd
```

All pods should show `Running` status.

- [ ] **Step 8: Verified demo flow**

Kill the auth pod manually and verify ArgoCD auto-heals it:
```bash
kubectl delete pod -n demo-app -l app=auth-service
# Watch ArgoCD recreate it
kubectl get pods -n demo-app -w
```