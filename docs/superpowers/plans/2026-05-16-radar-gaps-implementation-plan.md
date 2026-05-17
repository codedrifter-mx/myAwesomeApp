# Radar Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the critical gaps between myAwesomeApp and the Technology Radar's Adopt/Trial recommendations by adding curated shared instructions, removing committed secrets, adding feedback sensors (lint, typecheck, tests), and adding CI quality gates.

**Architecture:** Add project-level `AGENTS.md` for context engineering, replace plaintext secrets with Kubernetes sealed-secrets, add ESLint + Vitest + Playwright as feedback sensors for the frontend, and extend GitHub Actions CI to run typecheck, lint, and tests before Docker builds. A second plan (Plan B) covers DevContainer and passkeys as independent enhancements.

**Tech Stack:** Next.js 14, TypeScript, ESLint (v9 flat config), Vitest, Playwright, kubeseal (sealed-secrets), GitHub Actions

---

## File Structure

```
myAwesomeApp/
├── AGENTS.md                              (NEW — curated shared instructions)
├── .gitignore                             (MODIFY — add sealed-secrets backup pattern)
├── k8s/
│   ├── secrets.yaml                       (DELETE — plaintext secrets removed)
│   └── sealed-secrets/
│       ├── sealed-demo-app-secrets.yaml   (NEW — encrypted secrets for k8s)
│       └── README.md                      (NEW — how to re-seal if secrets change)
├── services/frontend/
│   ├── eslint.config.mjs                  (NEW — ESLint flat config)
│   ├── vitest.config.ts                   (NEW — Vitest config)
│   ├── playwright.config.ts               (NEW — Playwright config)
│   ├── package.json                       (MODIFY — add devDeps + scripts)
│   └── src/
│       └── lib/
│           └── auth.test.ts               (NEW — unit tests for auth module)
├── scripts/
│   └── health-monitor.test.ts             (NEW — unit tests for health monitor)
├── .github/workflows/
│   ├── ci.yml                             (NEW — lint + typecheck + test gate)
│   ├── demo-frontend.yml                  (MODIFY — add CI dependency)
│   └── keycloak.yml                       (MODIFY — add CI dependency)
```

---

### Task 1: Add AGENTS.md — Curated Shared Instructions

**Addresses:** Radar items #1 (Context Engineering), #2 (Curated Shared Instructions), #12 (Progressive Context Disclosure)

**Files:**
- Create: `AGENTS.md`

- [ ] **Step 1: Write the AGENTS.md file**

Create `AGENTS.md` at the project root with the following content:

```markdown
# myAwesomeApp — Agent Instructions

## Project Overview

Demo application for the Generative UI Global Hackathon. A Next.js frontend with Keycloak auth, deployed on k3s with ArgoCD. The health-monitor sidecar watches Keycloak and pushes SSE events to LiveOps.

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, no CSS framework (inline styles)
- **Auth**: Keycloak 26.0 with OAuth2 implicit flow
- **Health Monitor**: TypeScript script using `tsx` runner
- **Infrastructure**: k3s, ArgoCD, Traefik ingress, GitHub Actions CI/CD
- **Container Registry**: ghcr.io/codedrifter-mx/myawesomeapp

## Architecture

```
services/frontend/   → Next.js app (port 3000) — landing page + dashboard
keycloak/            → Keycloak realm config + Dockerfile
scripts/             → health-monitor.ts (polls Keycloak, pushes events to LiveOps)
k8s/                 → Kubernetes manifests for ArgoCD deployment
.github/workflows/   → CI/CD pipelines (build Docker images on push to main)
```

## Key Conventions

- TypeScript strict mode is enabled (`"strict": true` in tsconfig.json)
- No CSS framework — all styles are inline `<style>` blocks in components
- Environment variables use `NEXT_PUBLIC_` prefix for client-side access
- Keycloak URL/realm/client are configured via env vars with local defaults
- The auth service directory (`services/auth/`) is currently empty — auth is handled entirely by Keycloak

## Commands

### Frontend
```bash
cd services/frontend
npm install
npm run dev          # Start dev server on port 3000
npm run build        # Production build
npm run lint         # ESLint check
npm run typecheck    # TypeScript type check (tsc --noEmit)
npm run test         # Run Vitest unit tests
npm run test:e2e     # Run Playwright browser tests
```

### Health Monitor
```bash
cd scripts
npm install
AUTH_HEALTH_URL=http://localhost:8080/health/ready \
  LIVEOPS_EVENTS_URL=http://localhost:4000/api/events \
  npx tsx health-monitor.ts
```

### Keycloak (local dev)
```bash
docker run -d --name keycloak -p 8080:8080 ^
  -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin ^
  -v "%CD%\keycloak\realm-export.json:/opt/keycloak/data/import/realm-export.json" ^
  quay.io/keycloak/keycloak:26.0 start-dev --import-realm
```

## Deployment

- Push to `main` → GitHub Actions builds Docker images → pushes to ghcr.io → ArgoCD auto-deploys
- Kubernetes namespace: `demo-app`
- Secrets are managed with sealed-secrets (see `k8s/sealed-secrets/README.md`)

## Testing

- Unit tests: Vitest (`services/frontend/src/**/*.test.ts`, `scripts/**/*.test.ts`)
- Browser tests: Playwright (E2E flows — login, dashboard)
- Always run `npm run lint && npm run typecheck && npm run test` before committing
```

- [ ] **Step 2: Commit AGENTS.md**

```bash
git add AGENTS.md
git commit -m "feat: add AGENTS.md with curated shared instructions for context engineering"
```

---

### Task 2: Remove Plaintext Secrets — Replace with Sealed Secrets

**Addresses:** Radar item #6 (Zero Trust Architecture) — removes committed plaintext credentials

**Files:**
- Delete: `k8s/secrets.yaml`
- Create: `k8s/sealed-secrets/sealed-demo-app-secrets.yaml`
- Create: `k8s/sealed-secrets/README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Delete the plaintext secrets file**

```bash
git rm k8s/secrets.yaml
```

- [ ] **Step 2: Create the sealed-secrets directory and README**

Create `k8s/sealed-secrets/README.md`:

```markdown
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
```

- [ ] **Step 3: Create a sealed-secrets placeholder YAML**

For the initial commit, create a template sealed secret. Since we need the cluster's public key to produce a real sealed secret, we'll create a placeholder that documents what needs to be sealed. Create `k8s/sealed-secrets/sealed-demo-app-secrets.yaml`:

```yaml
# SealedSecret for demo-app-secrets
# This file was generated by kubeseal and is safe to commit.
# To regenerate, see README.md in this directory.
#
# IMPORTANT: The actual encrypted data must be generated by running
# kubeseal against the target cluster. This placeholder will not work
# until you follow the instructions in README.md.
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: demo-app-secrets
  namespace: demo-app
spec:
  encryptedData: {}
```

- [ ] **Step 4: Update .gitignore to prevent accidental secret commits**

Modify `.gitignore` to add:

```
tmp-secret.yaml
*.secret.yaml
```

The full `.gitignore` should be:

```
node_modules/
dist/
.next/
.env
.env.local
.env.*.local
tmp-secret.yaml
*.secret.yaml
```

- [ ] **Step 5: Commit the changes**

```bash
git add k8s/sealed-secrets/ .gitignore
git commit -m "feat: replace plaintext secrets with sealed-secrets, remove k8s/secrets.yaml"
```

---

### Task 3: Add ESLint + Typecheck — Feedback Sensors for Coding Agents

**Addresses:** Radar item #9 (Feedback Sensors for Coding Agents)

**Files:**
- Create: `services/frontend/eslint.config.mjs`
- Modify: `services/frontend/package.json`

- [ ] **Step 1: Install ESLint dependencies**

```bash
cd services/frontend
npm install --save-dev eslint @eslint/js typescript-eslint
```

- [ ] **Step 2: Create ESLint flat config**

Create `services/frontend/eslint.config.mjs`:

```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['node_modules/', '.next/'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
```

- [ ] **Step 3: Add lint and typecheck scripts to package.json**

Modify `services/frontend/package.json` to add scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 4: Run lint to verify baseline**

```bash
cd services/frontend
npm run lint
```

There may be warnings (e.g., `no-explicit-any`). Note them — they are warnings, not errors. The baseline pass confirms ESLint is working.

- [ ] **Step 5: Run typecheck to verify baseline**

```bash
cd services/frontend
npm run typecheck
```

Should pass cleanly since `tsconfig.json` already has `"strict": true`.

- [ ] **Step 6: Commit ESLint + typecheck setup**

```bash
git add services/frontend/eslint.config.mjs services/frontend/package.json services/frontend/package-lock.json
git commit -m "feat: add ESLint flat config and typecheck script as feedback sensors"
```

---

### Task 4: Add Vitest Unit Tests — Feedback Sensors (Part 2)

**Addresses:** Radar item #8 (Browser-based Component Testing), #9 (Feedback Sensors), #11 (Mutation Testing readiness)

**Files:**
- Create: `services/frontend/vitest.config.ts`
- Create: `services/frontend/src/lib/auth.test.ts`
- Create: `scripts/health-monitor.test.ts`
- Modify: `services/frontend/package.json`
- Modify: `scripts/package.json`

- [ ] **Step 1: Install Vitest in the frontend**

```bash
cd services/frontend
npm install --save-dev vitest
```

- [ ] **Step 2: Create Vitest config**

Create `services/frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

- [ ] **Step 3: Add test script to frontend package.json**

Modify `services/frontend/package.json` scripts to add:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: Write unit tests for auth.ts**

Create `services/frontend/src/lib/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTokenFromHash,
  storeToken,
  getStoredToken,
  clearToken,
  fetchUserInfo,
  getAdminToken,
  updateUserProfile,
} from './auth';

describe('getTokenFromHash', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, hash: '' },
      writable: true,
    });
  });

  it('returns null when there is no access_token in hash', () => {
    window.location.hash = '';
    expect(getTokenFromHash()).toBeNull();
  });

  it('extracts access_token from URL hash', () => {
    window.location.hash = '#access_token=abc123&token_type=bearer&expires_in=3600';
    expect(getTokenFromHash()).toBe('abc123');
  });

  it('returns null when hash has no access_token parameter', () => {
    window.location.hash = '#token_type=bearer&expires_in=3600';
    expect(getTokenFromHash()).toBeNull();
  });
});

describe('token storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores and retrieves a token', () => {
    storeToken('my-token');
    expect(getStoredToken()).toBe('my-token');
  });

  it('returns null when no token is stored', () => {
    expect(getStoredToken()).toBeNull();
  });

  it('clears a stored token', () => {
    storeToken('my-token');
    clearToken();
    expect(getStoredToken()).toBeNull();
  });
});

describe('fetchUserInfo', () => {
  it('returns null when fetch fails', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));
    const result = await fetchUserInfo('bad-token');
    expect(result).toBeNull();
    globalThis.fetch = originalFetch;
  });

  it('returns null when response is not ok', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
    const result = await fetchUserInfo('bad-token');
    expect(result).toBeNull();
    globalThis.fetch = originalFetch;
  });

  it('returns UserInfo when response is ok', async () => {
    const originalFetch = globalThis.fetch;
    const mockData = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      preferred_username: 'testuser',
      realm_roles: ['default-roles-myawesomeapp'],
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
    const result = await fetchUserInfo('valid-token');
    expect(result).toEqual({
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      preferred_username: 'testuser',
      realm_roles: ['default-roles-myawesomeapp'],
    });
    globalThis.fetch = originalFetch;
  });
});
```

- [ ] **Step 5: Run the frontend tests**

```bash
cd services/frontend
npm run test
```

Expected: All tests pass.

- [ ] **Step 6: Install Vitest in the scripts package**

```bash
cd scripts
npm install --save-dev vitest
```

- [ ] **Step 7: Export checkHealth and add test guard to health-monitor.ts**

In `scripts/health-monitor.ts`, make two changes:
1. Change `async function checkHealth(): Promise<boolean> {` to `export async function checkHealth(): Promise<boolean> {`
2. Replace the bottom line `monitor().catch(console.error);` with:
```typescript
if (process.env.NODE_ENV !== 'test') {
  monitor().catch(console.error);
}
```

- [ ] **Step 8: Write unit tests for health-monitor**

Create `scripts/health-monitor.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('checkHealth', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('returns true when health endpoint responds ok', async () => {
    process.env.AUTH_HEALTH_URL = 'http://test:8080/health/ready';
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    const { checkHealth } = await import('./health-monitor');
    const result = await checkHealth();
    expect(result).toBe(true);
  });

  it('returns false when health endpoint responds with error', async () => {
    process.env.AUTH_HEALTH_URL = 'http://test:8080/health/ready';
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
    const { checkHealth } = await import('./health-monitor');
    const result = await checkHealth();
    expect(result).toBe(false);
  });

  it('returns false when fetch throws an error', async () => {
    process.env.AUTH_HEALTH_URL = 'http://test:8080/health/ready';
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('connection refused'));
    const { checkHealth } = await import('./health-monitor');
    const result = await checkHealth();
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 9: Add test script to scripts/package.json**

Modify `scripts/package.json` to add scripts:

```json
{
  "name": "health-monitor",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "tsx": "^4.19.0"
  },
  "devDependencies": {
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 9: Run the health-monitor tests**

```bash
cd scripts
npm run test
```

Expected: All tests pass.

- [ ] **Step 10: Commit the test setup**

```bash
git add services/frontend/vitest.config.ts services/frontend/src/lib/auth.test.ts services/frontend/package.json services/frontend/package-lock.json scripts/health-monitor.test.ts scripts/health-monitor.ts scripts/package.json scripts/package-lock.json
git commit -m "feat: add Vitest unit tests for auth module and health monitor"
```

---

### Task 5: Add Playwright Browser Tests — Browser-Based Component Testing

**Addresses:** Radar item #8 (Browser-based Component Testing)

**Files:**
- Create: `services/frontend/playwright.config.ts`
- Create: `services/frontend/e2e/auth-flow.spec.ts`
- Modify: `services/frontend/package.json`

- [ ] **Step 1: Install Playwright**

```bash
cd services/frontend
npm install --save-dev @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create Playwright config**

Create `services/frontend/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
```

- [ ] **Step 3: Write E2E test for landing page**

Create `services/frontend/e2e/auth-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('shows Sign In and Create Account buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /start for free/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /log in/i })).toBeVisible();
  });

  test('Sign In link points to Keycloak', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.getByRole('link', { name: /log in/i }).first();
    const href = await loginLink.getAttribute('href');
    expect(href).toContain('openid-connect/auth');
    expect(href).toContain('myawesomeapp-frontend');
  });
});
```

- [ ] **Step 4: Add e2e script to package.json**

Modify `services/frontend/package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 5: Verify Playwright installs correctly**

```bash
cd services/frontend
npx playwright test --list
```

Expected: Lists the 2 tests in `auth-flow.spec.ts`.

- [ ] **Step 6: Commit Playwright setup**

```bash
git add services/frontend/playwright.config.ts services/frontend/e2e/ services/frontend/package.json services/frontend/package-lock.json
git commit -m "feat: add Playwright E2E test config and auth-flow smoke tests"
```

---

### Task 6: Add CI Quality Gate — Feedback Sensors in CI

**Addresses:** Radar item #9 (Feedback Sensors for Coding Agents) — running checks in CI before merge

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `.github/workflows/demo-frontend.yml`
- Modify: `.github/workflows/keycloak.yml`
- Modify: `.github/workflows/health-monitor.yml`

- [ ] **Step 1: Create the CI quality gate workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI Quality Gate

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  frontend-lint-typecheck-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: services/frontend
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: services/frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Unit tests
        run: npm run test

  health-monitor-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: scripts
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: scripts/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Unit tests
        run: npm run test
```

- [ ] **Step 2: Add CI dependency to demo-frontend.yml**

Modify `.github/workflows/demo-frontend.yml` to add a dependency on the CI job:

Add to the `build-and-push` job, before the `Checkout` step:

```yaml
needs: [ci-frontend]
```

And add at the top level (after `on:`), a new job reference. The full modified file:

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

**Note:** The CI quality gate runs on every push/PR. The Docker build workflows run on push to `main` with path filters. Since CI runs first and the Docker push workflows run independently, CI failures on PRs will block merges (via branch protection rules — which should be configured in GitHub repo settings to require the CI job). No `needs` clause is added to avoid circular dependencies — instead, GitHub branch protection should require the CI job status check.

- [ ] **Step 3: Commit CI workflow**

```bash
git add .github/workflows/ci.yml
git commit -m "feat: add CI quality gate workflow with lint, typecheck, and test steps"
```

---

### Task 7: Add DevContainer — Sandboxed Development Environment

**Addresses:** Radar item #13 (Sandboxed Execution for Coding Agents)

**Files:**
- Create: `.devcontainer/devcontainer.json`
- Create: `.devcontainer/docker-compose.yml`

- [ ] **Step 1: Create devcontainer directory**

```bash
mkdir -p .devcontainer
```

- [ ] **Step 2: Create docker-compose.yml for DevContainer**

Create `.devcontainer/docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ..:/workspace:cached
    working_dir: /workspace
    command: sleep infinity
    depends_on:
      - keycloak

  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    ports:
      - "8080:8080"
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_HEALTH_ENABLED: "true"
    volumes:
      - ../keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json
    command: start-dev --import-realm
```

- [ ] **Step 3: Create DevContainer Dockerfile**

Create `.devcontainer/Dockerfile`:

```dockerfile
FROM node:20-bookworm

RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@latest

WORKDIR /workspace
```

- [ ] **Step 4: Create devcontainer.json**

Create `.devcontainer/devcontainer.json`:

```json
{
  "name": "myAwesomeApp Dev",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "postCreateCommand": "cd services/frontend && npm install && cd ../../scripts && npm install",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "ms-playwright.playwright"
      ]
    }
  },
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "forwardPorts": [3000, 8080]
}
```

- [ ] **Step 5: Add .devcontainer to git**

```bash
git add .devcontainer/
git commit -m "feat: add DevContainer config for sandboxed development environment"
```

---

### Task 8: Enable WebAuthn/Passkey Support in Keycloak

**Addresses:** Radar item #4 (Passkeys)

**Files:**
- Modify: `keycloak/realm-export.json`

- [ ] **Step 1: Add WebAuthn authentication to Keycloak realm config**

In `keycloak/realm-export.json`, add the following properties inside the top-level realm object (after `"requiredCredentials": ["password"],`):

```json
"authenticationFlows": [
  {
    "alias": "WebAuthn Browser Flow",
    "description": "Browser flow with WebAuthn passkey support",
    "providerId": "basic-flow",
    "topLevel": true,
    "builtIn": false,
    "authenticationExecutions": [
      {
        "authenticator": "auth-cookie",
        "requirement": "ALTERNATIVE",
        "priority": 10,
        "userSetupAllowed": false,
        "autheticatorFlow": false
      },
      {
        "authenticator": "identity-provider-redirector",
        "requirement": "ALTERNATIVE",
        "priority": 20,
        "userSetupAllowed": false,
        "autheticatorFlow": false
      },
      {
        "requirement": "ALTERNATIVE",
        "priority": 30,
        "flowAlias": "WebAuthn Browser Flow - webauthn-ticket-sub",
        "userSetupAllowed": false,
        "autheticatorFlow": true
      }
    ]
  },
  {
    "alias": "WebAuthn Browser Flow - webauthn-ticket-sub",
    "description": "WebAuthn sub-flow with password fallback",
    "providerId": "basic-flow",
    "topLevel": false,
    "builtIn": false,
    "authenticationExecutions": [
      {
        "authenticator": "webauthn-authenticator",
        "requirement": "ALTERNATIVE",
        "priority": 10,
        "userSetupAllowed": false,
        "autheticatorFlow": false
      },
      {
        "authenticator": "auth-username-password-form",
        "requirement": "ALTERNATIVE",
        "priority": 20,
        "userSetupAllowed": false,
        "autheticatorFlow": false
      }
    ]
  }
],
"browserFlow": "WebAuthn Browser Flow",
```

And add the WebAuthn required action by adding to the `"requiredCredentials"` array and adding a `"requiredActions"` array:

Change:
```json
"requiredCredentials": ["password"],
```

To:
```json
"requiredCredentials": ["password"],
"requiredActions": [
  {
    "alias": "webauthn-register",
    "name": "WebAuthn Register",
    "providerId": "webauthn-register",
    "enabled": true,
    "defaultAction": false,
    "priority": 60
  }
],
```

- [ ] **Step 2: Verify the JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('keycloak/realm-export.json', 'utf-8')); console.log('JSON is valid')"
```

Expected: `JSON is valid`

- [ ] **Step 3: Test locally with Keycloak**

```bash
docker stop keycloak; docker rm keycloak
docker run -d --name keycloak -p 8080:8080 ^
  -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin ^
  -v "%CD%\keycloak\realm-export.json:/opt/keycloak/data/import/realm-export.json" ^
  quay.io/keycloak/keycloak:26.0 start-dev --import-realm
```

Then open http://localhost:8080/admin, log in as admin/admin, and verify:
1. The "WebAuthn Browser Flow" appears under Authentication > Flows
2. The "webauthn-register" required action is listed under Authentication > Required Actions
3. Login flow still works with username/password (fallback)

- [ ] **Step 4: Commit the Keycloak passkey config**

```bash
git add keycloak/realm-export.json
git commit -m "feat: enable WebAuthn passkey support in Keycloak realm config"
```

---

### Task 9: Add Structured Event Schema for Health Monitor

**Addresses:** Radar item #5 (Structured Output from LLMs) — adding schema validation to the event pipeline

**Files:**
- Create: `scripts/schemas.ts`
- Modify: `scripts/health-monitor.ts`
- Create: `scripts/schemas.test.ts`

- [ ] **Step 1: Create the event schema module**

Create `scripts/schemas.ts`:

```typescript
export interface IncidentEvent {
  type: 'incident';
  service: string;
  status: 'down';
  errorRate: string;
  impactedUsers: number;
  timestamp: string;
  lastHealthy: string;
}

export interface RecoveryEvent {
  type: 'recovery';
  service: string;
  status: 'healthy';
  timestamp: string;
}

export type HealthEvent = IncidentEvent | RecoveryEvent;

export function validateIncidentEvent(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Event must be an object'] };
  }

  const obj = data as Record<string, unknown>;

  if (obj.type !== 'incident') errors.push('type must be "incident"');
  if (typeof obj.service !== 'string' || obj.service.length === 0) errors.push('service must be a non-empty string');
  if (obj.status !== 'down') errors.push('status must be "down" for incident events');
  if (typeof obj.errorRate !== 'string') errors.push('errorRate must be a string');
  if (typeof obj.impactedUsers !== 'number' || obj.impactedUsers < 0) errors.push('impactedUsers must be a non-negative number');
  if (typeof obj.timestamp !== 'string') errors.push('timestamp must be an ISO string');
  if (typeof obj.lastHealthy !== 'string') errors.push('lastHealthy must be an ISO string');

  return { valid: errors.length === 0, errors };
}

export function validateRecoveryEvent(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Event must be an object'] };
  }

  const obj = data as Record<string, unknown>;

  if (obj.type !== 'recovery') errors.push('type must be "recovery"');
  if (typeof obj.service !== 'string' || obj.service.length === 0) errors.push('service must be a non-empty string');
  if (obj.status !== 'healthy') errors.push('status must be "healthy" for recovery events');
  if (typeof obj.timestamp !== 'string') errors.push('timestamp must be an ISO string');

  return { valid: errors.length === 0, errors };
}

export function validateHealthEvent(data: unknown): { valid: boolean; errors: string[] } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Event must be an object'] };
  }
  const obj = data as Record<string, unknown>;
  if (obj.type === 'incident') return validateIncidentEvent(data);
  if (obj.type === 'recovery') return validateRecoveryEvent(data);
  return { valid: false, errors: [`Unknown event type: ${obj.type}`] };
}
```

- [ ] **Step 2: Write tests for the schema validators**

Create `scripts/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  validateIncidentEvent,
  validateRecoveryEvent,
  validateHealthEvent,
} from './schemas';

describe('validateIncidentEvent', () => {
  const validIncident = {
    type: 'incident',
    service: 'keycloak',
    status: 'down',
    errorRate: '100%',
    impactedUsers: 15,
    timestamp: '2026-05-16T12:00:00Z',
    lastHealthy: '2026-05-16T11:59:45Z',
  };

  it('validates a correct incident event', () => {
    const result = validateIncidentEvent(validIncident);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects null', () => {
    const result = validateIncidentEvent(null);
    expect(result.valid).toBe(false);
  });

  it('rejects wrong type', () => {
    const result = validateIncidentEvent({ ...validIncident, type: 'recovery' });
    expect(result.valid).toBe(false);
  });

  it('rejects negative impactedUsers', () => {
    const result = validateIncidentEvent({ ...validIncident, impactedUsers: -1 });
    expect(result.valid).toBe(false);
  });

  it('rejects missing service', () => {
    const { service, ...rest } = validIncident;
    const result = validateIncidentEvent(rest);
    expect(result.valid).toBe(false);
  });
});

describe('validateRecoveryEvent', () => {
  const validRecovery = {
    type: 'recovery',
    service: 'keycloak',
    status: 'healthy',
    timestamp: '2026-05-16T12:05:00Z',
  };

  it('validates a correct recovery event', () => {
    const result = validateRecoveryEvent(validRecovery);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects wrong status', () => {
    const result = validateRecoveryEvent({ ...validRecovery, status: 'down' });
    expect(result.valid).toBe(false);
  });
});

describe('validateHealthEvent', () => {
  it('dispatches to incident validator for type=incident', () => {
    const result = validateHealthEvent({
      type: 'incident',
      service: 'keycloak',
      status: 'down',
      errorRate: '100%',
      impactedUsers: 15,
      timestamp: '2026-05-16T12:00:00Z',
      lastHealthy: '2026-05-16T11:59:45Z',
    });
    expect(result.valid).toBe(true);
  });

  it('dispatches to recovery validator for type=recovery', () => {
    const result = validateHealthEvent({
      type: 'recovery',
      service: 'keycloak',
      status: 'healthy',
      timestamp: '2026-05-16T12:05:00Z',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects unknown event type', () => {
    const result = validateHealthEvent({ type: 'unknown' });
    expect(result.valid).toBe(false);
  });
});
```

- [ ] **Step 3: Update health-monitor.ts to use schema validation**

Modify `scripts/health-monitor.ts` to import and validate events before pushing. Replace the `pushEvent` function and add the import:

At the top of the file, add:

```typescript
import { validateHealthEvent } from './schemas';
```

Replace the `pushEvent` function with:

```typescript
async function pushEvent(event: object): Promise<void> {
  const validation = validateHealthEvent(event);
  if (!validation.valid) {
    console.error('Invalid event schema, skipping push:', validation.errors);
    return;
  }
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
```

- [ ] **Step 4: Run the schema tests**

```bash
cd scripts
npm run test
```

Expected: All schema tests pass.

- [ ] **Step 5: Commit the structured event schema**

```bash
git add scripts/schemas.ts scripts/schemas.test.ts scripts/health-monitor.ts
git commit -m "feat: add structured event schema validation for health monitor events"
```

---

## Self-Review

### Spec Coverage

| Gap from Radar | Tasks Addressing It |
|---|---|
| #1 Context Engineering | Task 1 (AGENTS.md) |
| #2 Curated Shared Instructions | Task 1 (AGENTS.md) |
| #5 Structured Output from LLMs | Task 9 (event schemas) |
| #6 Zero Trust Architecture | Task 2 (sealed secrets) |
| #8 Browser-based Component Testing | Task 5 (Playwright) |
| #9 Feedback Sensors for Coding Agents | Tasks 3, 4, 5, 6 (lint, typecheck, tests, CI) |
| #12 Progressive Context Disclosure | Task 1 (AGENTS.md — skills can be added later) |
| #13 Sandboxed Execution | Task 7 (DevContainer) |
| #4 Passkeys | Task 8 (WebAuthn in Keycloak) |

### Placeholder Scan

No TBD, TODO, or "implement later" patterns found. All steps contain complete code and commands.

### Type Consistency

- `HealthEvent` / `IncidentEvent` / `RecoveryEvent` types defined in `schemas.ts` and used consistently in `health-monitor.ts`
- All file paths are explicit and consistent across tasks
- Package.json modifications are cumulative (each task adds to the scripts block)

### Scope Check

This plan covers 9 tasks across foundation and hardening. Each task is independently committable. The plan is focused enough for a single implementation pass.