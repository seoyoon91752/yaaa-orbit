/**
 * Default profile picture: a deterministic "random" constellation drawn in
 * blueprint style. The same seed always produces the same star pattern.
 */
function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export function ConstellationAvatar({
  seed,
  className = "",
}: {
  seed: string;
  className?: string;
}) {
  const next = rng(hash(seed || "yaaa"));
  const count = 5 + Math.floor(next() * 3); // 5 — 7 stars
  const stars = Array.from({ length: count }, () => ({
    x: 16 + next() * 68,
    y: 16 + next() * 68,
    r: 1.1 + next() * 1.8,
  }));

  // Connect the stars as a simple path, plus one extra branch.
  const order = stars.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i]!, order[j]!] = [order[j]!, order[i]!];
  }
  const lines = order.slice(1).map((idx, i) => [stars[order[i]!]!, stars[idx]!] as const);
  if (stars.length > 3) {
    lines.push([stars[order[0]!]!, stars[order[order.length - 1]!]!] as const);
  }

  return (
    <svg viewBox="0 0 100 100" className={`h-full w-full ${className}`} aria-hidden="true">
      <g stroke="currentColor" className="text-primary/35">
        {lines.map((l, i) => (
          <line key={i} x1={l[0].x} y1={l[0].y} x2={l[1].x} y2={l[1].y} strokeWidth={0.8} />
        ))}
      </g>
      <g className="text-primary">
        {stars.map((s, i) => (
          <g key={i}>
            <circle cx={s.x} cy={s.y} r={s.r} fill="currentColor" />
            <circle
              cx={s.x}
              cy={s.y}
              r={s.r + 2.4}
              fill="none"
              stroke="currentColor"
              strokeWidth={0.4}
              className="text-primary/30"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
