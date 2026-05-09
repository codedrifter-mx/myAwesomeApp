# Vanta Globe Dynamic Background Design

**Goal:** Add a subtle 3D animated globe (Vanta.js) as a dynamic background layer on the landing page hero section.

**Architecture:** A single `'use client'` React component wrapping Vanta's GLOBE effect, dynamically imported with SSR disabled. Positioned behind the existing CSS blob animations so the globe is a subtle extra layer rather than a replacement. The existing CSS mesh grid and floating blobs remain on top.

**Tech Stack:** Next.js 14 App Router, React 18, Three.js (r134+), Vanta.js (globe effect), TypeScript.

---

## Background

The current landing page hero uses CSS-only background effects: a teal/purple blob animation with a grid overlay. The user wants to enhance this by adding Vanta's 3D globe as a subtle animated layer behind the existing visuals, making the page feel more dynamic and production-grade without losing the current aesthetic.

## Design Decisions

### Approach: NPM Packages + Dynamic Import

- Install `three` and `vanta` from npm rather than using CDN script tags
- Import `THREE` from npm and pass it to Vanta's init function (avoids global `window.THREE`)
- Use `next/dynamic` with `ssr: false` — Three.js requires browser globals like `window`, and Vanta's canvas rendering is meaningless server-side
- Single-purpose component with focused lifecycle management

### Colors

- Globe color: `0x6cde2e` (lime green — brand accent, matches user's snippet)
- Background color: `0x0a0a0a` (matches existing hero `#0a0a0a` so the globe fades into the dark background)
- The existing teal/purple blobs and grid overlay remain on top, creating depth

### Positioning

- Absolutely positioned at `inset: 0` with `z-index: -1` inside the hero `<section>`
- Rendered before the `mesh-container` in DOM order, so existing z-index layers (mesh blobs at 0, grid at 1, content at 10, nav at 20) all sit above it naturally

### Error & Edge Cases

| Case | Behavior |
|------|----------|
| WebGL unsupported | Globe silently fails; existing CSS background shows through |
| Three.js load failure | Try/catch prevents crash; div is empty/invisible |
| Server-side render | `ssr: false` — nothing renders, no hydration mismatch |
| Resize/orientation change | Vanta auto-resizes with container (hero is `min-height: 100vh`) |
| Unmount/navigate away | `useEffect` cleanup calls `vantaEffect.destroy()` |

## Files

- **Create:** `services/frontend/src/components/VantaBackground.tsx`
- **Modify:** `services/frontend/src/app/page.tsx` (add dynamic import + component)
- **Install:** `three` + `vanta` npm packages

## Component API

```tsx
// VantaBackground — no props, fully self-contained
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
    return () => { vantaRef.current?.destroy(); };
  }, []);

  return <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: -1 }} />;
}
```

## Usage in Page

```tsx
import dynamic from 'next/dynamic';
const VantaBackground = dynamic(() => import('@/components/VantaBackground'), { ssr: false });

export default function HomePage() {
  return (
    <section className="hero">
      <VantaBackground />
      <div className="mesh-container"> ... </div>
      ...
    </section>
  );
}
```

## Testing

- Page loads without crash in modern browsers (Chrome, Firefox, Safari)
- Globe renders as a subtle background behind mesh blobs
- Page loads without crash in environments without WebGL (silent fallback)
- No console errors related to SSR/hydration
- Cleanup on navigation away (no orphaned canvas/animations)
