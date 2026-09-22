/** Hairline data ticker — observatory telemetry strip. */
const ITEMS = [
  "YONSEI AMATEUR ASTRONOMICAL ASSOCIATION",
  "EST. 1985",
  "37.5665°N  126.9380°E",
  "SEOUL · SINCHON CAMPUS",
  "OBSERVATION · ASTROPHOTOGRAPHY · SEMINAR",
  "MEMBERS ONLY",
];

export function SkyTicker() {
  const row = (
    <div className="marquee-track flex shrink-0 items-center gap-10 pr-10">
      {ITEMS.map((t) => (
        <span key={t} className="label-mono flex items-center gap-10 whitespace-nowrap">
          {t}
          <span className="h-1 w-1 rounded-full bg-gold/70" />
        </span>
      ))}
    </div>
  );

  return (
    <div className="flex overflow-hidden border-y border-border/70 py-3">
      {row}
      {row}
    </div>
  );
}
