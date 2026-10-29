'use client';

import { useEffect, useRef } from 'react';

interface DottedWordmarkProps {
  text?: string;
}

/**
 * Renders a large halftone dot-matrix wordmark ("Rahnamo") inspired by
 * UzCombinator's dotted wordmark transition, using warm Silk Road terracotta/gold dots.
 */
export default function DottedWordmark({ text = 'Rahnamo' }: DottedWordmarkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let dots: { x: number; y: number; r: number; phase: number; color: string }[] = [];
    const pointer = { x: -9999, y: -9999 };

    const buildDots = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(120, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Offscreen canvas to rasterize the wordmark text
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const octx = off.getContext('2d');
      if (!octx) return;

      octx.clearRect(0, 0, w, h);
      const fontSize = Math.min(h * 0.78, w * 0.175);
      octx.font = `900 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.fillStyle = '#000000';
      octx.fillText(text, w / 2, h / 2);

      const img = octx.getImageData(0, 0, w, h).data;
      const step = w < 640 ? 4 : 5;
      const nextDots: { x: number; y: number; r: number; phase: number; color: string }[] = [];

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const idx = (y * w + x) * 4;
          const alpha = img[idx + 3];
          if (alpha > 90) {
            const isEdge = alpha < 220;
            const seed = (x * 17 + y * 31) % 100;
            nextDots.push({
              x: x + ((seed % 3) - 1) * 0.4,
              y: y + ((seed % 5) - 2) * 0.3,
              r: isEdge ? 1.15 : seed % 4 === 0 ? 1.85 : 1.45,
              phase: seed * 0.08,
              color:
                seed % 7 === 0
                  ? 'rgba(212, 168, 75, 0.85)'
                  : seed % 3 === 0
                    ? 'rgba(224, 109, 26, 0.92)'
                    : 'rgba(232, 134, 62, 0.72)',
            });
          }
        }
      }
      dots = nextDots;
    };

    buildDots();
    window.addEventListener('resize', buildDots);

    let t = 0;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      t += 0.03;

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const dx = d.x - pointer.x;
        const dy = d.y - pointer.y;
        const distSq = dx * dx + dy * dy;
        let ox = 0;
        let oy = 0;
        if (distSq < 3600 && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = (60 - dist) / 60;
          ox = (dx / dist) * force * 6;
          oy = (dy / dist) * force * 6;
        }

        const pulse = 0.88 + 0.16 * Math.sin(t + d.phase);
        ctx.beginPath();
        ctx.arc(d.x + ox, d.y + oy, d.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.fill();
      }

      animId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', buildDots);
    };
  }, [text]);

  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-2 select-none">
      <div className="relative w-full h-[110px] sm:h-[165px] lg:h-[210px]">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="w-full h-full block"
        />
      </div>
    </div>
  );
}
