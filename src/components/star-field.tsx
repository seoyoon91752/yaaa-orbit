import { useEffect, useRef } from "react";

type Star = { x: number; y: number; r: number; a: number; tw: number };

/** Very faint procedural star field with sparse constellation lines. */
export function StarField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let raf = 0;
    let stars: Star[] = [];
    let links: Array<[number, number]> = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round((w * h) / 12000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.1 + 0.25,
        a: Math.random() * 0.45 + 0.15,
        tw: Math.random() * Math.PI * 2,
      }));

      links = [];
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const a = stars[i]!;
          const b = stars[j]!;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 130 && Math.random() < 0.06) links.push([i, j]);
        }
      }
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      ctx.lineWidth = 0.5;
      for (const [i, j] of links) {
        const a = stars[i]!;
        const b = stars[j]!;
        ctx.strokeStyle = "rgba(40, 80, 210, 0.13)";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      for (const s of stars) {
        const twinkle = reduced ? 1 : 0.75 + Math.sin(frame * 0.01 + s.tw) * 0.25;
        ctx.globalAlpha = s.a * twinkle;
        ctx.fillStyle = s.r > 1 ? "rgba(30, 64, 200, 0.85)" : "rgba(60, 100, 220, 0.6)";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      frame++;
      raf = window.requestAnimationFrame(draw);
    };

    build();
    draw();
    window.addEventListener("resize", build);
    return () => {
      window.removeEventListener("resize", build);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
