import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell, useMemberContext } from "@/components/member-shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KIND_LABEL, SCALE_LABEL, SCALE_LIST, type SkyScale } from "@/components/sky-form";

export const Route = createFileRoute("/_authenticated/universe")({
  head: () => ({
    meta: [
      { title: "나의 우주 — YAAA 연세 아마추어 천문회" },
      {
        name: "description",
        content: "별가루로 천체를 모아 실제 적경 · 적위 좌표 위에 나만의 하늘을 만드는 보관함.",
      },
      { property: "og:title", content: "나의 우주 — YAAA" },
      { property: "og:description", content: "수집한 천체를 실제 하늘 좌표에 배치한 개인 성도." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UniversePage,
});

type Rarity = "common" | "rare" | "epic";

const RARITY_LABEL: Record<Rarity, string> = {
  common: "일반",
  rare: "레어",
  epic: "에픽",
};

const RARITY_OF_SCALE: Record<string, Rarity> = {
  solar: "common",
  stellar: "rare",
  galactic: "epic",
};

type OwnedRow = {
  object_id: string;
  rarity: string;
  obtained_at: string;
  celestial_objects: {
    id: string;
    name: string;
    latin_name: string | null;
    summary: string | null;
    description: string | null;
    scale: string;
    kind_code: string;
    subtype: string | null;
    ra: string | null;
    decl: string | null;
    best_season: string | null;
    direction: string | null;
  } | null;
};

/** "05h 35m 17s" -> hours. Falls back to a stable pseudo-position from the id. */
function parseRa(raw: string | null, seed: string): number {
  const m = raw?.match(/(-?\d+(?:\.\d+)?)\s*h(?:\s*(\d+(?:\.\d+)?)\s*m)?(?:\s*(\d+(?:\.\d+)?)\s*s)?/i);
  if (!m) return (hash(seed) % 2400) / 100;
  return Number(m[1]) + Number(m[2] ?? 0) / 60 + Number(m[3] ?? 0) / 3600;
}

/** "−05° 23′ 28″" -> degrees. */
function parseDec(raw: string | null, seed: string): number {
  const norm = (raw ?? "").replace(/[−–—]/g, "-");
  const m = norm.match(/(-?\+?\d+(?:\.\d+)?)\s*°(?:\s*(\d+(?:\.\d+)?)\s*[′'])?(?:\s*(\d+(?:\.\d+)?)\s*[″"])?/);
  if (!m) return ((hash(seed + "d") % 1200) - 600) / 10;
  const deg = Number(m[1]!.replace("+", ""));
  const sign = deg < 0 || m[1]!.startsWith("-") ? -1 : 1;
  return deg + sign * (Number(m[2] ?? 0) / 60 + Number(m[3] ?? 0) / 3600);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 1_000_000;
  return h;
}

const SOLAR_KINDS = new Set([
  "planet",
  "dwarf_planet",
  "moon",
  "asteroid",
  "comet",
  "meteoroid",
  "minor_body",
]);
const GALAXY_KINDS = new Set([
  "galaxy",
  "galaxy_cluster",
  "supercluster",
  "quasar",
  "large_structure",
]);

function UniversePage() {
  const { userId } = useMemberContext();
  const queryClient = useQueryClient();
  const [scaleFilter, setScaleFilter] = useState<SkyScale | "all">("all");
  const [selected, setSelected] = useState<OwnedRow | null>(null);
  const [drawn, setDrawn] = useState<
    { name: string; latin: string | null; summary: string | null; kind: string; rarity: Rarity } | null
  >(null);

  const total = useQuery({
    queryKey: ["sky-total"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("celestial_objects")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const balance = useQuery({
    queryKey: ["stardust", userId],
    enabled: Boolean(userId),
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

  const owned = useQuery({
    queryKey: ["collection", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_celestial_objects")
        .select(
          "object_id, rarity, obtained_at, celestial_objects(id, name, latin_name, summary, description, scale, kind_code, subtype, ra, decl, best_season, direction)",
        )
        .eq("user_id", userId!)
        .order("obtained_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OwnedRow[];
    },
  });

  const ownedCount = owned.data?.length ?? 0;
  const totalCount = total.data ?? 0;
  const complete = totalCount > 0 && ownedCount >= totalCount;

  const draw = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("draw_celestial");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("뽑기에 실패했습니다.");
      return row as {
        name: string;
        latin_name: string | null;
        summary: string | null;
        kind_code: string;
        rarity: Rarity;
      };
    },
    onSuccess: (row) => {
      setDrawn({
        name: row.name,
        latin: row.latin_name,
        summary: row.summary,
        kind: row.kind_code,
        rarity: row.rarity,
      });
      queryClient.invalidateQueries({ queryKey: ["collection", userId] });
      queryClient.invalidateQueries({ queryKey: ["stardust", userId] });
      queryClient.invalidateQueries({ queryKey: ["stardust-ledger", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const placed = useMemo(() => {
    return (owned.data ?? [])
      .filter((r) => r.celestial_objects)
      .filter((r) => scaleFilter === "all" || r.celestial_objects!.scale === scaleFilter)
      .map((r) => {
        const o = r.celestial_objects!;
        const ra = parseRa(o.ra, o.id);
        const dec = parseDec(o.decl, o.id);
        return {
          row: r,
          left: Math.min(96, Math.max(4, (1 - (((ra % 24) + 24) % 24) / 24) * 100)),
          top: Math.min(94, Math.max(6, ((90 - Math.max(-90, Math.min(90, dec))) / 180) * 100)),
          rarity: (RARITY_OF_SCALE[o.scale] ?? "common") as Rarity,
        };
      });
  }, [owned.data, scaleFilter]);

  return (
    <MemberShell
      eyebrow="My Universe"
      title="나의 우주"
      actions={
        <button
          disabled={complete || draw.isPending || (balance.data ?? 0) < 1}
          onClick={() => draw.mutate()}
          className="glow-cyan shrink-0 rounded-sm border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted-foreground disabled:shadow-none"
        >
          {complete
            ? "모든 천체를 수집했습니다"
            : draw.isPending
              ? "관측 중…"
              : "천체 뽑기 · 별가루 1"}
        </button>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {(["all", ...SCALE_LIST] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScaleFilter(s)}
              className={`rounded-sm border px-4 py-2 font-mono text-xs transition-colors ${
                scaleFilter === s
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "전체" : SCALE_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-5 font-mono text-xs">
          <span className="text-gold">STARDUST · {balance.data ?? 0}</span>
          <span className="text-muted-foreground">
            COLLECTED · {ownedCount} / {totalCount}
          </span>
        </div>
      </div>

      <div className="relative mt-8 aspect-[16/10] w-full overflow-hidden rounded-lg border border-border bg-black">
        {placed.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center font-mono text-xs text-muted-foreground">
            {complete ? "표시할 천체가 없습니다." : "아직 아무것도 보이지 않는 하늘입니다."}
          </p>
        )}
        {placed.map(({ row, left, top, rarity }) => (
          <button
            key={row.object_id}
            onClick={() => setSelected(row)}
            style={{ left: `${left}%`, top: `${top}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 outline-none"
            aria-label={row.celestial_objects!.name}
          >
            <ObjectMark kind={row.celestial_objects!.kind_code} rarity={rarity} />
          </button>
        ))}
        <div className="pointer-events-none absolute bottom-3 left-4 font-mono text-[10px] text-muted-foreground/60">
          RA 24h ←→ 0h · DEC +90° ~ −90°
        </div>
      </div>

      <p className="mt-4 font-mono text-[11px] text-muted-foreground">
        천체는 저장된 적경 · 적위 좌표를 그대로 투영해 배치됩니다. 많이 모을수록 실제 하늘에
        가까워집니다.
      </p>

      <QuestBoard userId={userId} />

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {selected?.celestial_objects?.name}
            </DialogTitle>
          </DialogHeader>
          {selected?.celestial_objects && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 font-mono text-[11px]">
                <span className="rounded-sm border border-border px-2.5 py-1 text-muted-foreground">
                  {SCALE_LABEL[selected.celestial_objects.scale as SkyScale]}
                </span>
                <span className="rounded-sm border border-primary/40 bg-primary/10 px-2.5 py-1 text-primary">
                  {KIND_LABEL[selected.celestial_objects.kind_code] ??
                    selected.celestial_objects.kind_code}
                  {selected.celestial_objects.subtype ? ` · ${selected.celestial_objects.subtype}` : ""}
                </span>
                <span className="rounded-sm border border-gold/40 bg-gold/10 px-2.5 py-1 text-gold">
                  {RARITY_LABEL[(RARITY_OF_SCALE[selected.celestial_objects.scale] ?? "common") as Rarity]}
                </span>
              </div>
              {selected.celestial_objects.latin_name && (
                <p className="font-mono text-xs text-muted-foreground">
                  {selected.celestial_objects.latin_name}
                </p>
              )}
              {selected.celestial_objects.summary && (
                <p className="leading-relaxed">{selected.celestial_objects.summary}</p>
              )}
              <dl className="space-y-2 font-mono text-xs text-muted-foreground">
                <p>RA · {selected.celestial_objects.ra ?? "—"}</p>
                <p>DEC · {selected.celestial_objects.decl ?? "—"}</p>
                <p>SEASON · {selected.celestial_objects.best_season ?? "—"}</p>
                <p>DIRECTION · {selected.celestial_objects.direction ?? "—"}</p>
              </dl>
              {selected.celestial_objects.description && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {selected.celestial_objects.description}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(drawn)} onOpenChange={(o) => !o && setDrawn(null)}>
        <DialogContent className="border-border bg-black text-center">
          <DialogHeader>
            <DialogTitle className="label-mono text-center">
              {drawn ? RARITY_LABEL[drawn.rarity] : ""} 천체 획득
            </DialogTitle>
          </DialogHeader>
          {drawn && (
            <div className="flex flex-col items-center gap-6 py-6">
              <div
                className={
                  drawn.rarity === "epic"
                    ? "animate-[pulse_1.4s_ease-in-out_infinite] rounded-full p-14 shadow-[0_0_120px_40px_oklch(0.8_0.15_90/0.35)]"
                    : drawn.rarity === "rare"
                      ? "rounded-full p-12 shadow-[0_0_70px_20px_oklch(0.8_0.15_200/0.28)]"
                      : "rounded-full p-10 shadow-[0_0_35px_8px_oklch(0.8_0.05_240/0.2)]"
                }
              >
                <ObjectMark kind={drawn.kind} rarity={drawn.rarity} big />
              </div>
              <div>
                <p className="font-display text-3xl font-semibold">{drawn.name}</p>
                {drawn.latin && (
                  <p className="mt-2 font-mono text-xs text-muted-foreground">{drawn.latin}</p>
                )}
                {drawn.summary && (
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {drawn.summary}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MemberShell>
  );
}

function ObjectMark({
  kind,
  rarity,
  big = false,
}: {
  kind: string;
  rarity: Rarity;
  big?: boolean;
}) {
  const base = big ? 64 : rarity === "epic" ? 22 : rarity === "rare" ? 16 : 10;
  const glow =
    rarity === "epic"
      ? "0 0 22px 6px oklch(0.8 0.15 90 / 0.55)"
      : rarity === "rare"
        ? "0 0 14px 3px oklch(0.8 0.15 200 / 0.45)"
        : "0 0 8px 2px oklch(0.9 0.02 240 / 0.35)";
  const color =
    rarity === "epic" ? "oklch(0.85 0.15 90)" : rarity === "rare" ? "oklch(0.85 0.13 200)" : "oklch(0.95 0.01 240)";

  if (kind === "nebula") {
    return (
      <span
        style={{
          width: base * 2.2,
          height: base * 2.2,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          filter: "blur(2px)",
        }}
        className="block rounded-full opacity-80"
      />
    );
  }

  if (GALAXY_KINDS.has(kind)) {
    return (
      <span
        style={{
          width: base * 2,
          height: base * 1.1,
          background: `radial-gradient(ellipse at center, ${color} 0%, transparent 72%)`,
          boxShadow: glow,
          transform: "rotate(-28deg)",
        }}
        className="block rounded-[50%] opacity-90"
      />
    );
  }

  if (kind === "cluster") {
    return (
      <span className="relative block" style={{ width: base * 1.8, height: base * 1.8 }}>
        {[
          [50, 20],
          [22, 55],
          [72, 48],
          [40, 78],
          [62, 72],
        ].map(([x, y]) => (
          <span
            key={`${x}-${y}`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: Math.max(2, base / 4),
              height: Math.max(2, base / 4),
              background: color,
              boxShadow: glow,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
          />
        ))}
      </span>
    );
  }

  if (SOLAR_KINDS.has(kind)) {
    return (
      <span
        style={{
          width: base * 0.85,
          height: base * 0.85,
          background: color,
          boxShadow: glow,
        }}
        className="block rounded-full"
      />
    );
  }

  // 항성 · 잔해체 · 계외행성 · 갈색왜성
  return (
    <span className="relative block" style={{ width: base, height: base }}>
      <span
        style={{ background: color, boxShadow: glow }}
        className="absolute inset-0 m-auto block size-[45%] rounded-full"
      />
      <span
        style={{ background: `linear-gradient(to right, transparent, ${color}, transparent)` }}
        className="absolute top-1/2 left-0 block h-px w-full -translate-y-1/2 opacity-70"
      />
      <span
        style={{ background: `linear-gradient(to bottom, transparent, ${color}, transparent)` }}
        className="absolute top-0 left-1/2 block h-full w-px -translate-x-1/2 opacity-70"
      />
    </span>
  );
}
