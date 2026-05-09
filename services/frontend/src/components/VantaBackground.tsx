'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// @ts-expect-error - vanta has no TypeScript declarations
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

  return <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />;
}
