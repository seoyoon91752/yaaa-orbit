import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberContext } from "@/components/member-shell";

type Row = {
  object_id: string;
  celestial_objects: { id: string; name: string; scale: string; ra: string | null; decl: string | null } | null;
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 1_000_000;
  return h;
}

function parseRa(raw: string | null, seed: string): number {
  const m = raw?.match(/(-?\d+(?:\.\d+)?)\s*h(?:\s*(\d+(?:\.\d+)?)\s*m)?/i);
  if (!m) return (hash(seed) % 2400) / 100;
  return Number(m[1]) + Number(m[2] ?? 0) / 60;
}

function parseDec(raw: string | null, seed: string): number {
  const norm = (raw ?? "").replace(/[−–—]/g, "-");
  const m = norm.match(/(-?\+?\d+(?:\.\d+)?)\s*°/);
  if (!m) return ((hash(seed + "d") % 1200) - 600) / 10;
  return Number(m[1]!.replace("+", ""));
}

/** Blueprint star-chart strip: stardust balance + a mini projection of the collection. */
export function UniversePreview() {
  const { userId, profile } = useMemberContext();
  const enabled = Boolean(userId) && profile?.status === "verified";

  const balance = useQuery({
    queryKey: ["stardust", userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stardust_balances")
        .select("balance")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? 0;
    },
  });

  const total = useQuery({
    queryKey: ["sky-total"],
    enabled,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("celestial_objects")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const owned = useQuery({
    queryKey: ["collection", userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_celestial_objects")
        .select("object_id, celestial_objects(id, name, scale, ra, decl)")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const ownedCount = owned.data?.length ?? 0;
  const totalCount = total.data ?? 0;
  const ratio = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  const placed = useMemo(
    () =>
      (owned.data ?? [])
        .filter((r) => r.celestial_objects)
        .map((r) => {
          const o = r.celestial_objects!;
          const ra = parseRa(o.ra, o.id);
          const dec = parseDec(o.decl, o.id);
          return {
            id: o.id,
            name: o.name,
            scale: o.scale,
            left: Math.min(97, Math.max(3, (1 - (((ra % 24) + 24) % 24) / 24) * 100)),
            top: Math.min(93, Math.max(7, ((90 - Math.max(-90, Math.min(90, dec))) / 180) * 100)),
          };
        }),
    [owned.data],
  );

  return (
    <section className="blueprint-panel mt-16 rounded-lg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
        <p className="label-mono">Sheet 02 — My Universe / Chart</p>
        <Link
          to="/universe"
          className="font-mono text-[11px] text-primary transition-opacity hover:opacity-80"
        >
          나의 우주 →
        </Link>
      </header>

      <div className="grid gap-px bg-border lg:grid-cols-[1fr_auto]">
        <div className="relative bg-background/70">
          <div className="relative h-52 overflow-hidden sm:h-64">
            <Grid />
            {placed.length === 0 ? (
              <p className="absolute inset-0 flex items-center justify-center px-6 text-center font-mono text-xs text-muted-foreground">
                아직 수집한 천체가 없습니다. 별가루로 첫 천체를 뽑아 보세요.
              </p>
            ) : (
              placed.map((p) => (
                <span
                  key={p.id}
                  title={p.name}
                  style={{ left: `${p.left}%`, top: `${p.top}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                >
                  <Mark scale={p.scale} />
                </span>
              ))
            )}
            <p className="pointer-events-none absolute bottom-2 left-4 font-mono text-[10px] text-muted-foreground/70">
              RA 24h ←→ 0h · DEC +90° ~ −90°
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border lg:w-64 lg:grid-cols-1">
          <div className="bg-background/70 px-6 py-6">
            <p className="label-mono">Stardust</p>
            <p className="mt-2 font-mono text-3xl text-gold">{balance.data ?? 0}</p>
          </div>
          <div className="bg-background/70 px-6 py-6">
            <p className="label-mono">Collected</p>
            <p className="mt-2 font-mono text-lg">
              {ownedCount} <span className="text-muted-foreground">/ {totalCount}</span>
            </p>
            <div className="mt-3 h-1 w-full bg-border">
              <div className="h-full bg-primary" style={{ width: `${ratio}%` }} />
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">{ratio}%</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Grid() {
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <pattern id="chart-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M40 0 L0 0 0 40"
            fill="none"
            stroke="color-mix(in oklab, var(--primary) 12%, transparent)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#chart-grid)" />
      <line
        x1="0"
        y1="50%"
        x2="100%"
        y2="50%"
        stroke="color-mix(in oklab, var(--primary) 35%, transparent)"
        strokeDasharray="4 4"
      />
    </svg>
  );
}

function Mark({ scale }: { scale: string }) {
  if (scale === "galactic") {
    return (
      <span className="block size-3 rotate-45 border border-gold bg-gold/25" aria-hidden />
    );
  }
  if (scale === "stellar") {
    return (
      <span className="block size-2.5 rounded-full border border-primary bg-primary/30" aria-hidden />
    );
  }
  return <span className="block size-1.5 rounded-full bg-primary" aria-hidden />;
}
