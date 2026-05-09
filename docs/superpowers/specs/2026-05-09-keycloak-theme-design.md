# Keycloak Login Theme Design

**Goal:** Customize Keycloak's login, registration, and logout confirmation pages to visually match myAwesomeApp's dark-themed hero/dashboard style.

**Architecture:** A Keycloak 26 theme extending the `keycloak` base theme, providing CSS-only overrides. The theme directory lives alongside the realm config in the `keycloak/` directory and is baked into the custom Docker image.

**Tech Stack:** Keycloak 26, CSS, Docker

---

## Background

The existing myAwesomeApp uses Keycloak 26.0 as its identity provider. Users authenticate on Keycloak's default themed pages — creating a visual disconnect from the dark, polished myAwesomeApp interface. When a user clicks "Log in" or "Start for free" on the dark hero section, the jump to Keycloak's default light-themed login page is jarring. This spec defines a CSS-only theme override to make login, registration, and logout feel like natural parts of the app.

## Scope

### Pages to Theme
- **Login page** — sign-in form (email/username + password)
- **Registration page** — user self-signup form
- **Logout confirmation page** — "Are you sure?" confirmation

### Pages NOT in Scope
- Error pages (404, etc.) — low-traffic, low-impact
- Account management pages — Keycloak account console is a separate concern
- Email templates (verify email, password reset) — transactional, not branded

## Design Decisions

### Approach: CSS-Only Theme Override

- Create a custom Keycloak theme that extends the built-in `keycloak` theme
- Provide only `theme.properties` and `resources/css/login.css`
- Keycloak's existing FreeMarker templates render as-is; CSS handles the full visual transformation
- Zero Java/FreeMarker changes — upgrade-safe and low-maintenance

### Why Not Full Templates

Full FreeMarker template overrides give pixel-level control but:
1. Keycloak's template API changes between major versions
2. More surface area for bugs and maintenance
3. The CSS-only approach is sufficient for matching colors, typography, spacing, and component styles

### Theme Location

The theme lives under `keycloak/themes/myawesomeapp/login/` — alongside the realm config in the project's Keycloak directory. The Dockerfile is updated to copy the theme into the Keycloak container at build time.

## Visual Design

### Color Palette

| Token | Value | CSS Variable | Usage |
|-------|-------|-------------|-------|
| Page background | `#0a0a0a` | `--bg-dark` | Full page background |
| Card background | `rgba(255,255,255,0.04)` | `--card-bg` | Form card surface |
| Card border | `rgba(255,255,255,0.06)` | `--card-border` | Form card outline |
| Card radius | `14px` | `--card-radius` | Card corners |
| Text primary | `#ffffff` | `--text-primary` | All body text |
| Text muted | `rgba(255,255,255,0.4)` | `--text-muted` | Labels, secondary copy |
| Text links | `rgba(255,255,255,0.5)` | `--text-link` | Register/forgot links |
| Accent teal | `#38b2ac` | `--accent` | Primary button, focus ring, hover states |
| Accent teal hover | `#2d9a94` | `--accent-hover` | Button hover |
| Input background | `rgba(255,255,255,0.05)` | `--input-bg` | Text input fill |
| Input border | `rgba(255,255,255,0.1)` | `--input-border` | Text input outline |
| Input radius | `8px` | `--input-radius` | Input corners |
| Error color | `#f56565` | `--error` | Error messages |
| Success color | `#48bb78` | `--success` | Success messages |
| Secondary button border | `rgba(255,255,255,0.15)` | none | Outline variant |

### Typography

| Element | Size | Weight | Transform | Spacing |
|---------|------|--------|-----------|---------|
| Card title / app name | 24px | 500 | none | `-0.05em` |
| Form heading | 14-16px | 400 | none | normal |
| Field labels | 12px | 500 | uppercase | `0.05em` |
| Input text | 14px | 400 | none | normal |
| Button text | 15px | 500 | none | normal |
| Links / hints | 13px | 400 | none | normal |

Font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, system-ui, sans-serif`

### Component Styles

**Primary Button:**
- Background: `#38b2ac`, hover: `#2d9a94`
- Text: white, 15px, weight 500
- Border-radius: `9999px` (pill)
- Padding: `14px 28px`
- Full width on form, no border
- Cursor: pointer, transition on background

**Secondary Button (logout page):**
- Background: transparent
- Border: `1px solid rgba(255,255,255,0.15)`
- Text: white
- Border-radius: `9999px`
- Padding: `14px 28px`

**Form Inputs:**
- Background: `rgba(255,255,255,0.05)`
- Border: `1px solid rgba(255,255,255,0.1)`, border-radius: `8px`
- Text: white, 14px
- Padding: `12px 14px`
- Focus: border-color `#38b2ac`, box-shadow `0 0 0 3px rgba(56,178,172,0.15)`
- Placeholder: `rgba(255,255,255,0.3)`

**Form Card:**
- Background: `rgba(255,255,255,0.04)`
- Border: `1px solid rgba(255,255,255,0.06)`, border-radius: `14px`
- Padding: `40px`
- Max-width: `420px`, centered horizontally + vertically
- No box-shadow (subtle border only, matching dashboard card style)

**Links:**
- Color: `rgba(255,255,255,0.5)`, 13px
- Hover: white
- No underline by default

**Error/Success Messages:**
- Error text: `#f56565`, background: `rgba(245,101,101,0.1)`
- Success text: `#48bb78`, background: `rgba(72,187,120,0.1)`
- Border-radius: `8px`, padding: `12px 16px`

## Files

### New Files

- `keycloak/themes/myawesomeapp/login/theme.properties`
- `keycloak/themes/myawesomeapp/login/resources/css/login.css`

### Modified Files

- `keycloak/Dockerfile` — add `COPY themes/ /opt/keycloak/themes/` and set `KC_SPI_THEME_DEFAULT`

## Theme Configuration

### theme.properties

```properties
parent=keycloak
import=common/keycloak
styles=css/login.css
```

This tells Keycloak to:
- Extend the `keycloak` base theme (inherit templates)
- Import common styles
- Load our custom `login.css` as the primary stylesheet

### Dockerfile Update

Add to the existing Dockerfile before the ENTRYPOINT:
```dockerfile
COPY themes/ /opt/keycloak/themes/
ENV KC_SPI_THEME_DEFAULT=myawesomeapp
```

This:
1. Copies the theme directory into Keycloak's theme directory
2. Sets the default theme to `myawesomeapp` so all realms use it by default

## CSS Architecture

The `login.css` file uses a layered approach:

1. **CSS Custom Properties** — define the color palette and design tokens at `:root`
2. **Global resets** — body background, font, layout (`body.login-pf`)
3. **Card container** — `#kc-content`, `#kc-content-wrapper` sizing and positioning
4. **Typography** — `#kc-header-wrapper` (app name), form titles
5. **Form controls** — inputs, labels, checkboxes
6. **Buttons** — primary and secondary variants with hover/active states
7. **Alerts** — error/success/info message styling
8. **Footer/links** — social login, register links, language selector
9. **Responsive** — mobile adjustments (< 640px)

### Key CSS Selectors

Target selectors are based on Keycloak 26's default template output:

| Selector | Purpose |
|----------|---------|
| `body.login-pf` | Page-level background and layout |
| `#kc-header` | Brand header area |
| `#kc-header-wrapper` | App name display |
| `#kc-content` | Main content container |
| `#kc-content-wrapper` | Inner content wrapper |
| `div.login-pf-settings` | Row for "remember me" + "forgot password" |
| `#kc-form` | Form element |
| `#kc-form-title` | Form heading text |
| `#kc-form-wrapper` | Form container |
| `#kc-info-wrapper` | Info section (register link) |
| `#kc-social-providers` | Social login section |
| `#kc-feedback` | Error/success feedback |
| `.pf-v5-c-button` | PatternFly button override |
| `.pf-v5-c-form-control` | PatternFly input override |
| `.pf-v5-c-alert` | PatternFly alert override |

**Note:** Exact selectors will be verified against the running Keycloak instance during implementation. The CSS is written to be specific enough to override PatternFly defaults without using `!important` unless necessary.

## Implementation Plan Outline

Estimated effort: small (1-2 focused sessions)

1. Create theme directory structure with `theme.properties` and `login.css`
2. Update `keycloak/Dockerfile` to bundle the theme
3. Add `KC_SPI_THEME_DEFAULT=myawesomeapp` environment variable
4. Update `k8s/keycloak-configmap.yaml` or deployment to set the theme env
5. Build and restart Keycloak to verify
6. Iterate on CSS selectors against live instance

## Testing

- Login page renders with dark background and teal button
- Registration page follows same visual pattern
- Logout confirmation page matches mockup layout
- Error states (wrong password, expired session) show properly styled messages
- All links (register, forgot password, back to login) are styled consistently
- Responsive: pages look correct on mobile viewports
- No visual regressions on Keycloak upgrade (CSS selectors remain valid)
