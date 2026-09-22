/** Minimal constellation line-art. Monochrome, hairline strokes, faint glow. */
export function ConstellationArt({ className = "" }: { className?: string }) {
  const nodes: Array<[number, number, number]> = [
    [40, 200, 2.2],
    [96, 128, 1.4],
    [150, 168, 3.2],
    [214, 96, 1.6],
    [268, 150, 2.4],
    [236, 232, 1.5],
    [162, 268, 2.8],
    [86, 252, 1.3],
    [300, 62, 1.2],
    [122, 60, 1],
  ];
  const links: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 0],
    [2, 6],
    [3, 8],
    [1, 9],
  ];

  return (
    <svg
      viewBox="0 0 340 320"
      aria-hidden="true"
      className={`h-full w-full ${className}`}
      fill="none"
    >
      <defs>
        <radialGradient id="ca-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="170" cy="170" r="150" fill="url(#ca-glow)" />
      <circle
        cx="170"
        cy="170"
        r="148"
        stroke="var(--border)"
        strokeWidth="1"
        strokeDasharray="2 8"
      />
      <circle cx="170" cy="170" r="104" stroke="var(--border)" strokeWidth="1" opacity="0.5" />

      {links.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={nodes[a]![0]}
          y1={nodes[a]![1]}
          x2={nodes[b]![0]}
          y2={nodes[b]![1]}
          stroke="var(--primary)"
          strokeWidth="0.75"
          opacity="0.35"
        />
      ))}

      {nodes.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r * 3} fill="var(--primary)" opacity="0.08" />
          <circle cx={x} cy={y} r={r} fill={r > 2.5 ? "var(--gold)" : "var(--foreground)"} />
        </g>
      ))}
    </svg>
  );
}
