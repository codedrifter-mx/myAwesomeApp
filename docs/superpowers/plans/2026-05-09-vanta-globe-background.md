# Vanta Globe Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a subtle 3D animated globe (Vanta.js) behind the existing CSS blob background on the landing page hero.

**Architecture:** A single `'use client'` React component wrapping Vanta's GLOBE effect, dynamically imported with `ssr: false` in the Next.js page. Positioned at `z-index: -1` inside the hero section so existing mesh blobs and content render on top.

**Tech Stack:** Next.js 14 App Router, React 18, Three.js (r134+), Vanta.js (globe effect), TypeScript.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `services/frontend/package.json` (auto-updated by npm)

- [ ] **Step 1: Install three and vanta**

```bash
cd services/frontend
npm install three vanta
```

Expected: Packages added to `node_modules/` and `package.json` dependencies.

---

### Task 2: Create VantaBackground Component

**Files:**
- Create: `services/frontend/src/components/VantaBackground.tsx`
- Note: Create the `components/` directory under `src/` if it doesn't exist.

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import GLOBE from 'vanta/dist/vanta.globe.min';

export default function VantaBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const vantaRef = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      vantaRef.current = GLOBE({
        el: ref.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.00,
        color: 0x6cde2e,
        backgroundColor: 0x0a0a0a,
      });
    } catch {}
    return () => {
      vantaRef.current?.destroy();
    };
  }, []);

  return <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: -1 }} />;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd services/frontend
npx tsc --noEmit
```

Expected: No type errors. (The `vanta` package may not ship TypeScript definitions — if there's an import error for `vanta/dist/vanta.globe.min`, add a `// @ts-ignore` comment before the import line.)

---

### Task 3: Integrate Component into Landing Page

**Files:**
- Modify: `services/frontend/src/app/page.tsx`

- [ ] **Step 1: Add dynamic import at top of page.tsx**

Add these imports at the top of the file (after the existing function declaration header):

```tsx
import dynamic from 'next/dynamic';

const VantaBackground = dynamic(() => import('@/components/VantaBackground'), { ssr: false });
```

- [ ] **Step 2: Add VantaBackground inside the hero section**

Add `VantaBackground` as the first child inside the `<section className="hero">`, before the `<div className="mesh-container">`:

```tsx
<section className="hero">
  <VantaBackground />
  <div className="mesh-container">
    <div className="mesh-blob mesh-teal" />
    <div className="mesh-blob mesh-purple" />
    <div className="mesh-blob mesh-dark" />
  </div>
...
```

---

### Task 4: Build and Verify

- [ ] **Step 1: Build the project**

```bash
cd services/frontend
npm run build
```

Expected: Build succeeds with no errors. The dynamic import warning (if any) should be informational only (Next.js logs about `ssr: false`).

- [ ] **Step 2: Start dev server and verify**

```bash
cd services/frontend
npm run dev
```

Open `http://localhost:3000` in a browser. Expected:
- Page loads without console errors
- A subtle animated globe is visible behind the mesh grid lines and floating blobs
- Globe has a green/lime hue on a dark background
- Mouse movement rotates/tilts the globe slightly
- Scrolling past the hero section, the globe is contained within the hero (not visible below it)
- Resizing the window — globe adjusts to fill the hero

- [ ] **Step 3: Verify SSR safety**

Open `curl http://localhost:3000` (or view page source). Expected:
- The HTML source should contain the hero content but NOT the Vanta canvas (it only renders client-side)
- No hydration mismatch errors in the browser console

---

### Task 5: Commit

- [ ] **Step 1: Commit the changes**

```bash
git add services/frontend/src/components/VantaBackground.tsx services/frontend/src/app/page.tsx services/frontend/package.json services/frontend/package-lock.json
git commit -m "feat: add Vanta.js globe as animated hero background"
```
