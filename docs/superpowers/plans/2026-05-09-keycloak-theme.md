# Keycloak Login Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customize Keycloak's login, registration, and logout pages to match myAwesomeApp's dark theme using CSS-only overrides.

**Architecture:** A Keycloak 26 theme extending the `keycloak` base theme, providing only custom CSS. The theme directory lives alongside the realm config in `keycloak/` and is baked into the custom Docker image via a COPY instruction + `KC_SPI_THEME_DEFAULT` env var.

**Tech Stack:** Keycloak 26, CSS, Docker, Kubernetes

---

## File Structure

```
keycloak/
  themes/
    myawesomeapp/
      login/
        theme.properties              (new — theme definition)
        resources/
          css/
            login.css                 (new — full stylesheet)
  Dockerfile                          (modify — add theme COPY + ENV)
k8s/
  keycloak-deployment.yaml            (modify — add KC_SPI_THEME_DEFAULT env)
  keycloak-configmap.yaml             (possibly modify — bundle realm config)
```

### Task 1: Create theme directory and theme.properties

**Files:**
- Create: `keycloak/themes/myawesomeapp/login/theme.properties`

- [ ] **Step 1: Create directory structure and theme.properties**

```bash
mkdir -p keycloak/themes/myawesomeapp/login/resources/css
```

- [ ] **Step 2: Write theme.properties**

```properties
parent=keycloak
import=common/keycloak
styles=css/login.css
```

This tells Keycloak to inherit all FreeMarker templates from the `keycloak` base theme while loading our custom stylesheet on top.

- [ ] **Step 3: Commit**

```bash
git add keycloak/themes/myawesomeapp/login/theme.properties
git commit -m "feat(keycloak): add custom theme directory and properties"
```

---

### Task 2: Write the login.css stylesheet

**Files:**
- Create: `keycloak/themes/myawesomeapp/login/resources/css/login.css`

- [ ] **Step 1: Write login.css**

```css
/* ============================================
   myAwesomeApp Keycloak Login Theme
   Dark theme matching app hero/dashboard style
   ============================================ */

:root {
  /* Backgrounds */
  --bg-dark: #0a0a0a;
  --card-bg: rgba(255, 255, 255, 0.04);
  --card-border: rgba(255, 255, 255, 0.06);
  --card-radius: 14px;
  --input-bg: rgba(255, 255, 255, 0.05);
  --input-border: rgba(255, 255, 255, 0.1);
  --input-radius: 8px;

  /* Text */
  --text-primary: #ffffff;
  --text-muted: rgba(255, 255, 255, 0.4);
  --text-link: rgba(255, 255, 255, 0.5);

  /* Accent */
  --accent: #38b2ac;
  --accent-hover: #2d9a94;
  --accent-glow: rgba(56, 178, 172, 0.15);

  /* Feedback */
  --error: #f56565;
  --success: #48bb78;

  /* Typography */
  --font-stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, system-ui, sans-serif;
}

/* ---- Page layout ---- */
body.login-pf {
  background: var(--bg-dark);
  font-family: var(--font-stack);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  margin: 0;
  padding: 24px;
}

/* ---- Header / Brand ---- */
#kc-header {
  text-align: center;
  margin-bottom: 32px;
}

#kc-header-wrapper {
  font-size: 24px;
  font-weight: 500;
  letter-spacing: -0.05em;
  color: var(--text-primary);
  padding: 0;
  border: none;
  background: none;
}

/* ---- Content card ---- */
#kc-content {
  width: 100%;
  max-width: 420px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  padding: 40px;
}

#kc-content-wrapper {
  width: 100%;
}

/* ---- Form title ---- */
#kc-form-title {
  text-align: center;
  font-size: 14px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 24px;
}

/* ---- Form groups ---- */
#kc-form {
  width: 100%;
}

#kc-form > div:not(.pf-v5-c-form):not([class]) {
  /* PatternFly form wrapper */
}

.login-pf-settings {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16px 0;
}

/* ---- Form labels ---- */
.pf-v5-c-form__label,
#kc-form label {
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  display: block;
  margin-bottom: 6px;
}

/* ---- Form inputs ---- */
.pf-v5-c-form-control {
  background: var(--input-bg) !important;
  border: 1px solid var(--input-border) !important;
  border-radius: var(--input-radius) !important;
  color: var(--text-primary) !important;
  font-size: 14px !important;
  padding: 12px 14px !important;
  font-family: var(--font-stack);
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.pf-v5-c-form-control:focus {
  border-color: var(--accent) !important;
  box-shadow: 0 0 0 3px var(--accent-glow) !important;
  outline: none;
}

.pf-v5-c-form-control::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

/* Fix PatternFly's default input background override */
.pf-v5-c-form-control:not(textarea) {
  background: var(--input-bg) !important;
}

/* ---- Checkbox ---- */
.pf-v5-c-check {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pf-v5-c-check__input {
  accent-color: var(--accent);
  width: 16px;
  height: 16px;
}

.pf-v5-c-check__label {
  font-size: 13px;
  color: var(--text-link);
}

/* ---- Buttons ---- */
#kc-form-buttons {
  margin-top: 24px;
}

.pf-v5-c-button[type="submit"],
.pf-v5-c-button.pf-m-primary {
  background: var(--accent) !important;
  color: #fff !important;
  border: none !important;
  border-radius: 9999px !important;
  padding: 14px 28px !important;
  font-size: 15px !important;
  font-weight: 500 !important;
  font-family: var(--font-stack);
  cursor: pointer;
  width: 100%;
  transition: background 0.15s ease;
  line-height: 1.2;
}

.pf-v5-c-button[type="submit"]:hover,
.pf-v5-c-button.pf-m-primary:hover {
  background: var(--accent-hover) !important;
}

/* Secondary button (used on logout page) */
.pf-v5-c-button.pf-m-secondary {
  background: transparent !important;
  color: #fff !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 9999px !important;
  padding: 14px 28px !important;
  font-size: 15px !important;
  font-weight: 500 !important;
  font-family: var(--font-stack);
  cursor: pointer;
  width: 100%;
  transition: background 0.15s ease;
  line-height: 1.2;
}

.pf-v5-c-button.pf-m-secondary:hover {
  background: rgba(255, 255, 255, 0.05) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}

/* Button on the logout page */
#kc-logout-confirm .pf-v5-c-button {
  margin-bottom: 12px;
}

/* ---- Links ---- */
#kc-info-wrapper a,
.kc-back-link a,
.login-pf a:not(.pf-v5-c-button) {
  color: var(--text-link) !important;
  font-size: 13px;
  text-decoration: none;
  transition: color 0.15s ease;
}

#kc-info-wrapper a:hover,
.kc-back-link a:hover,
.login-pf a:not(.pf-v5-c-button):hover {
  color: var(--text-primary) !important;
}

/* ---- Info wrapper (register link area) ---- */
#kc-info-wrapper {
  text-align: center;
  padding-top: 20px;
  font-size: 13px;
  color: var(--text-muted);
}

/* ---- Alerts / Feedback ---- */
#kc-feedback {
  margin-bottom: 16px;
}

.pf-v5-c-alert {
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border: none;
}

.pf-v5-c-alert.pf-m-danger {
  background: rgba(245, 101, 101, 0.1);
  color: var(--error);
}

.pf-v5-c-alert.pf-m-success {
  background: rgba(72, 187, 120, 0.1);
  color: var(--success);
}

.pf-v5-c-alert.pf-m-info {
  background: rgba(56, 178, 172, 0.1);
  color: var(--accent);
}

.pf-v5-c-alert__title {
  font-size: 14px;
  font-weight: 500;
}

/* ---- Social login ---- */
#kc-social-providers {
  margin-top: 24px;
  text-align: center;
}

#kc-social-providers ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kc-social-link {
  display: block;
}

.kc-social-link .pf-v5-c-button {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 8px !important;
  color: var(--text-primary) !important;
  padding: 10px 16px !important;
  font-size: 14px;
  width: 100%;
}

.kc-social-link .pf-v5-c-button:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

/* ---- Locale dropdown ---- */
#kc-locale-dropdown {
  position: fixed;
  top: 16px;
  right: 16px;
}

#kc-locale-dropdown a {
  color: var(--text-muted);
  font-size: 12px;
  text-decoration: none;
}

/* ---- Logout confirmation page ---- */
#kc-logout-confirm {
  text-align: center;
}

#kc-logout-confirm p {
  color: var(--text-muted);
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.5;
}

/* ---- Responsive ---- */
@media (max-width: 640px) {
  body.login-pf {
    padding: 16px;
  }

  #kc-content {
    padding: 24px;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add keycloak/themes/myawesomeapp/login/resources/css/login.css
git commit -m "feat(keycloak): add custom login theme stylesheet"
```

---

### Task 3: Update Dockerfile to bundle the theme

**Files:**
- Modify: `keycloak/Dockerfile`

- [ ] **Step 1: Update Dockerfile**

Add COPY for the theme directory and set the default theme env var. The updated Dockerfile:

```dockerfile
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
```

- [ ] **Step 2: Build the Docker image locally to verify**

```bash
docker build -t myawesomeapp-keycloak:latest ./keycloak/
```

Expected: Build succeeds, no errors. The `themes/` directory is copied to `/opt/keycloak/themes/` inside the container.

- [ ] **Step 3: Commit**

```bash
git add keycloak/Dockerfile
git commit -m "feat(keycloak): bundle custom theme in Docker image"
```

---

### Task 4: Update Kubernetes deployment

**Files:**
- Modify: `k8s/keycloak-deployment.yaml`

- [ ] **Step 1: Add KC_SPI_THEME_DEFAULT to the deployment env**

Read the current deployment to find the env section:

```bash
cat k8s/keycloak-deployment.yaml
```

Add the following environment variable to the keycloak container spec:

```yaml
env:
  - name: KC_SPI_THEME_DEFAULT
    value: myawesomeapp
```

Place it alongside the existing env vars (KC_HEALTH_ENABLED, KC_METRICS_ENABLED, etc.).

- [ ] **Step 2: Verify the manifest is valid YAML**

```bash
python -c "import yaml; yaml.safe_load(open('k8s/keycloak-deployment.yaml')); print('Valid YAML')"
```

Or use any available YAML validator. Expected: prints "Valid YAML".

- [ ] **Step 3: Commit**

```bash
git add k8s/keycloak-deployment.yaml
git commit -m "feat(keycloak): set default theme in k8s deployment"
```

---

### Verification

After all tasks are complete, verify the theme works end-to-end:

1. **Build and run locally:**
   ```bash
   docker build -t myawesomeapp-keycloak:latest ./keycloak/
   docker run -p 8080:8080 myawesomeapp-keycloak:latest
   ```

2. **Open the login page** at `http://localhost:8080/realms/myawesomeapp/account` or trigger login from the app at `http://localhost:3000`

3. **Check:**
   - Page background is dark (#0a0a0a)
   - Form card has subtle dark border and rounded corners
   - "Sign In" button is teal and pill-shaped
   - Input fields have dark backgrounds with white text
   - Labels are uppercase and muted
   - Focus states show teal glow
   - Registration page follows same style
   - Logout confirmation has both secondary (outline) and primary (teal) buttons
   - Error messages show correctly styled alerts
