import { useEffect, useState } from "react";

/** Thin observation-log strip: site coordinates + local time, drawn faintly. */
export function CoordinateLine() {
  const [stamp, setStamp] = useState("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setStamp(
        `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} KST`,
      );
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="border-b border-border/40">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-1.5">
        <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground/70">
          37°33′58″N 126°56′17″E
        </span>
        <span className="h-px flex-1 bg-border/60" />
        <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground/70">
          {stamp || "—"}
        </span>
      </div>
    </div>
  );
}
