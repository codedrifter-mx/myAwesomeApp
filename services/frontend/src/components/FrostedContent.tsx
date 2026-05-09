'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export default function FrostedContent({ children, className, style }: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = (e: MouseEvent) => {
      const rect = el!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const maxDist = Math.max(window.innerWidth, window.innerHeight) * 0.5;
      const t = Math.min(dist / maxDist, 1);

      el!.style.setProperty('--frost-blur', `blur(${(1 - t) * 14}px)`);
      el!.style.setProperty('--frost-bg', `rgba(0,0,0,${(1 - t) * 0.35})`);
      el!.style.setProperty('--frost-shadow', `0 ${2 + (1 - t) * 16}px ${4 + (1 - t) * 24}px rgba(0,0,0,${0.3 + (1 - t) * 0.4})`);
    };

    update({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 } as MouseEvent);

    window.addEventListener('mousemove', update, { passive: true });
    return () => window.removeEventListener('mousemove', update);
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        backdropFilter: 'var(--frost-blur, blur(6px))',
        WebkitBackdropFilter: 'var(--frost-blur, blur(6px))',
        background: 'var(--frost-bg, rgba(0,0,0,0.12))',
      }}
    >
      {children}
    </div>
  );
}
