import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell, useMemberContext } from "@/components/member-shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  SkyForm,
  emptySky,
  KIND_LABEL,
  SCALE_KINDS,
  SCALE_LABEL,
  SCALE_LIST,
  type SkyFormState,
  type SkyScale,
} from "@/components/sky-form";
import { SheetStrip } from "@/components/sheet-strip";

export const Route = createFileRoute("/_authenticated/sky/")({
  head: () => ({
    meta: [
      { title: "천체 정보 — YAAA 연세 아마추어 천문회" },
      {
        name: "description",
        content: "태양계부터 은하 이상 규모까지 규모 · 종류별로 정리한 YAAA 별 백과사전.",
      },
      { property: "og:title", content: "천체 정보 — YAAA" },
      { property: "og:description", content: "적경 · 적위 좌표까지 정리한 천체 백과사전." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SkyIndex,
});

type SkyRow = {
  id: string;
  scale: string;
  kind_code: string;
  subtype: string | null;
  name: string;
  latin_name: string | null;
  summary: string | null;
  ra: string | null;
  decl: string | null;
};

function SkyIndex() {
  const { isOfficer } = useMemberContext();
  const queryClient = useQueryClient();
  const [scale, setScale] = useState<SkyScale>("solar");
  const [kind, setKind] = useState<string>("all");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<SkyFormState>(emptySky);
  const [formOpen, setFormOpen] = useState(false);

  const objects = useQuery({
    queryKey: ["sky"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("celestial_objects")
        .select("id, scale, kind_code, subtype, name, latin_name, summary, ra, decl")
        .order("name");
      if (error) throw error;
      return (data ?? []) as SkyRow[];
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (objects.data ?? []).filter(
      (o) =>
        o.scale === scale &&
        (kind === "all" || o.kind_code === kind) &&
        (!needle ||
          o.name.toLowerCase().includes(needle) ||
          (o.latin_name ?? "").toLowerCase().includes(needle)),
    );
  }, [objects.data, scale, kind, q]);

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("celestial_objects").insert({
        kind: "star",
        scale: form.scale,
        kind_code: form.kind_code,
        subtype: form.subtype.trim() || null,
        name: form.name.trim(),
        latin_name: form.latin_name.trim() || null,
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        best_season: form.best_season.trim() || null,
        direction: form.direction.trim() || null,
        magnitude: form.magnitude.trim() || null,
        ra: form.ra.trim() || null,
        decl: form.decl.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("천체 정보가 등록되었습니다.");
      setFormOpen(false);
      setForm(emptySky);
      queryClient.invalidateQueries({ queryKey: ["sky"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MemberShell
      eyebrow="Celestial Catalog"
      title="천체 정보"
      actions={
        isOfficer ? (
          <button
            onClick={() => {
              setForm({ ...emptySky, scale, kind_code: SCALE_KINDS[scale][0]! });
              setFormOpen(true);
            }}
            className="shrink-0 rounded-sm border border-primary/40 px-4 py-2.5 text-sm text-primary transition-colors hover:bg-primary/10"
          >
            항목 추가
          </button>
        ) : null
      }
    >

      <div className="flex flex-wrap gap-2">
        {SCALE_LIST.map((s) => (
          <button
            key={s}
            onClick={() => {
              setScale(s);
              setKind("all");
            }}
            className={`rounded-sm border px-5 py-2.5 font-mono text-xs transition-colors ${
              scale === s
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {SCALE_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {["all", ...SCALE_KINDS[scale]].map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-sm border px-3.5 py-1.5 font-mono text-[11px] transition-colors ${
                kind === k
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-border/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "all" ? "전체" : KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름으로 검색"
          className="w-full shrink-0 rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50 sm:w-56"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 font-mono text-sm text-muted-foreground">검색 결과가 없습니다.</p>
      ) : (
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => (
            <Link
              key={o.id}
              to="/sky/$objectId"
              params={{ objectId: o.id }}
              className="group flex flex-col bg-card/60 p-7 transition-colors hover:bg-primary/5"
            >
              <span className="label-mono">
                {KIND_LABEL[o.kind_code] ?? o.kind_code}
                {o.subtype ? ` · ${o.subtype}` : ""}
              </span>
              <h3 className="mt-3 font-display text-xl font-semibold transition-colors group-hover:text-primary">
                {o.name}
              </h3>
              {o.latin_name && (
                <p className="mt-1 font-mono text-xs text-muted-foreground">{o.latin_name}</p>
              )}
              {o.summary && (
                <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {o.summary}
                </p>
              )}
              <p className="mt-5 font-mono text-[11px] text-muted-foreground">
                RA {o.ra ?? "—"} · DEC {o.decl ?? "—"}
              </p>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">천체 항목 추가</DialogTitle>
          </DialogHeader>
          <SkyForm
            form={form}
            setForm={setForm}
            pending={create.isPending}
            onSubmit={() => {
              if (!form.name.trim()) {
                toast.error("이름을 입력해 주세요.");
                return;
              }
              create.mutate();
            }}
          />
        </DialogContent>
      </Dialog>
    </MemberShell>
  );
}
