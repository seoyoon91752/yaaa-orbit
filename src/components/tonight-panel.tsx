import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberContext } from "@/components/member-shell";
import { daySeed, hhmm, moonPhase, sunTimes } from "@/lib/sky-today";

/** Drafting-table almanac: moon phase dial, sun times, one object worth观 tonight. */
export function TonightPanel() {
  const { profile } = useMemberContext();
  const now = useMemo(() => new Date(), []);
  const moon = useMemo(() => moonPhase(now), [now]);
  const sun = useMemo(() => sunTimes(now), [now]);
  const seed = useMemo(() => daySeed(now), [now]);

  const pick = useQuery({
    queryKey: ["tonight-pick", seed],
    enabled: profile?.status === "verified",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("celestial_objects")
        .select("id, name, latin_name, summary, best_season, direction, scale, kind_code")
        .order("name");
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[seed % data.length]!;
    },
  });

  const dateLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(now);

  return (
    <section className="blueprint-panel mt-16 rounded-lg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
        <p className="label-mono">Sheet 01 — Tonight&apos;s Sky / Seoul</p>
        <p className="font-mono text-[11px] text-muted-foreground">{dateLabel}</p>
      </header>

      <div className="grid gap-px bg-border md:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-6 bg-background/70 px-6 py-7">
          <MoonDial fraction={moon.fraction} />
          <div>
            <p className="label-mono">Moon</p>
            <p className="mt-2 font-display text-xl font-semibold">{moon.label}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              ILLUM · {moon.illumination}%
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
          <Cell label="Sunset" value={hhmm(sun.sunset)} accent />
          <Cell label="Sunrise" value={hhmm(sun.sunrise)} />
          <Cell
            label="Dark hours"
            value={
              sun.sunrise && sun.sunset
                ? `${Math.max(0, Math.round(((sun.sunrise.getTime() + 86_400_000 - sun.sunset.getTime()) / 3_600_000) % 24))}h`
                : "—"
            }
          />
          <Cell label="Sky cond." value={moon.illumination > 70 ? "달 밝음" : "관측 양호"} />
        </dl>
      </div>

      <div className="border-t border-border px-6 py-6">
        <p className="label-mono">Pick of the night</p>
        {pick.isLoading ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground">LOADING…</p>
        ) : pick.data ? (
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display text-2xl font-semibold">
                {pick.data.name}
                {pick.data.latin_name && (
                  <span className="ml-3 font-mono text-xs font-normal text-muted-foreground">
                    {pick.data.latin_name}
                  </span>
                )}
              </p>
              {pick.data.summary && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {pick.data.summary}
                </p>
              )}
              <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                SEASON · {pick.data.best_season ?? "—"} / DIRECTION · {pick.data.direction ?? "—"}
              </p>
            </div>
            <Link
              to="/sky/$objectId"
              params={{ objectId: pick.data.id }}
              className="shrink-0 rounded-sm border border-primary/40 px-4 py-2 font-mono text-xs text-primary transition-colors hover:bg-primary/10"
            >
              자세히 →
            </Link>
          </div>
        ) : (
          <p className="mt-3 font-mono text-xs text-muted-foreground">등록된 천체가 없습니다.</p>
        )}
      </div>
    </section>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-background/70 px-6 py-7">
      <p className="label-mono">{label}</p>
      <p className={`mt-2 font-mono text-lg ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

/** Technical-drawing moon dial: outline circle with a hatched shadow terminator. */
function MoonDial({ fraction }: { fraction: number }) {
  const size = 72;
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  // terminator ellipse width: 0 at quarter, full at new/full
  const k = Math.cos(2 * Math.PI * fraction);
  const waxing = fraction < 0.5;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <defs>
        <pattern id="moon-hatch" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 4 L4 0" stroke="var(--border)" strokeWidth="1" />
        </pattern>
        <clipPath id="moon-clip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="url(#moon-hatch)" stroke="var(--border)" />
      <g clipPath="url(#moon-clip)">
        <path
          d={`M ${cx} ${cy - r}
              A ${r} ${r} 0 0 ${waxing ? 1 : 0} ${cx} ${cy + r}
              A ${Math.abs(r * k)} ${r} 0 0 ${k > 0 ? (waxing ? 0 : 1) : waxing ? 1 : 0} ${cx} ${cy - r} Z`}
          fill="color-mix(in oklab, var(--primary) 18%, transparent)"
          stroke="var(--primary)"
          strokeWidth="1"
        />
      </g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--primary)" strokeWidth="1" />
      <line x1={cx} y1={2} x2={cx} y2={size - 2} stroke="var(--border)" strokeDasharray="2 3" />
    </svg>
  );
}
