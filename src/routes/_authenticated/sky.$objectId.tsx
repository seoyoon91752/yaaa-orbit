import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell, useMemberContext } from "@/components/member-shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  SkyForm,
  emptySky,
  KIND_LABEL,
  SCALE_LABEL,
  scaleOfKind,
  type SkyFormState,
  type SkyScale,
} from "@/components/sky-form";

export const Route = createFileRoute("/_authenticated/sky/$objectId")({
  head: () => ({
    meta: [
      { title: "천체 상세 — YAAA 연세 아마추어 천문회" },
      { name: "description", content: "천체의 설명과 관측 시기 · 방향 정보." },
      { property: "og:title", content: "천체 상세 — YAAA" },
      { property: "og:description", content: "YAAA 별 백과사전 상세 정보." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SkyDetail,
  errorComponent: () => (
    <MemberShell eyebrow="Celestial Object" title="천체 정보">
      <p className="font-mono text-sm text-destructive">정보를 불러오지 못했습니다.</p>
    </MemberShell>
  ),
  notFoundComponent: () => (
    <MemberShell eyebrow="Celestial Object" title="천체 정보">
      <p className="font-mono text-sm text-muted-foreground">항목을 찾을 수 없습니다.</p>
    </MemberShell>
  ),
});

function SkyDetail() {
  const { objectId } = Route.useParams();
  const { isOfficer } = useMemberContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<SkyFormState>(emptySky);
  const [formOpen, setFormOpen] = useState(false);

  const object = useQuery({
    queryKey: ["sky", objectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("celestial_objects")
        .select("*")
        .eq("id", objectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("celestial_objects")
        .update({
          scale: form.scale,
          kind_code: form.kind_code,
          subtype: form.subtype.trim() || null,
          ra: form.ra.trim() || null,
          decl: form.decl.trim() || null,
          name: form.name.trim(),
          latin_name: form.latin_name.trim() || null,
          summary: form.summary.trim() || null,
          description: form.description.trim() || null,
          image_url: form.image_url.trim() || null,
          best_season: form.best_season.trim() || null,
          direction: form.direction.trim() || null,
          magnitude: form.magnitude.trim() || null,
        })
        .eq("id", objectId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("수정되었습니다.");
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["sky"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("celestial_objects").delete().eq("id", objectId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["sky"] });
      navigate({ to: "/sky" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const o = object.data;

  return (
    <MemberShell eyebrow="Celestial Object" title={o?.name ?? "천체 정보"}>
      <Link
        to="/sky"
        className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        ← 천체 목록
      </Link>

      {o && (
        <div className="hairline mt-6 rounded-lg bg-card/60 p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-sm border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
              {SCALE_LABEL[(o.scale ?? "solar") as SkyScale]}
            </span>
            <span className="rounded-sm border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[11px] text-primary">
              {KIND_LABEL[o.kind_code] ?? o.kind_code}
              {o.subtype ? ` · ${o.subtype}` : ""}
            </span>
            {o.latin_name && (
              <span className="font-mono text-xs text-muted-foreground">{o.latin_name}</span>
            )}
            <span className="font-mono text-[11px] text-muted-foreground">ID · {o.id.slice(0, 8)}</span>
          </div>

          {o.image_url && (
            <img
              src={o.image_url}
              alt={o.name}
              className="mt-6 w-full rounded-lg border border-border object-cover"
            />
          )}

          {o.summary && <p className="mt-6 text-lg leading-relaxed">{o.summary}</p>}

          <dl className="mt-6 space-y-4 font-mono text-sm">
            <Row k="RA" v={o.ra ?? "—"} />
            <Row k="DEC" v={o.decl ?? "—"} />
            <Row k="SEASON" v={o.best_season ?? "—"} />
            <Row k="DIRECTION" v={o.direction ?? "—"} />
            <Row k="MAGNITUDE" v={o.magnitude ?? "—"} />
          </dl>

          {o.description && (
            <p className="mt-6 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {o.description}
            </p>
          )}

          {isOfficer && (
            <div className="mt-8 flex gap-2">
              <button
                onClick={() => {
                  setForm({
                    id: o.id,
                    scale: scaleOfKind(o.kind_code),
                    kind_code: o.kind_code,
                    subtype: o.subtype ?? "",
                    ra: o.ra ?? "",
                    decl: o.decl ?? "",
                    name: o.name,
                    latin_name: o.latin_name ?? "",
                    summary: o.summary ?? "",
                    description: o.description ?? "",
                    image_url: o.image_url ?? "",
                    best_season: o.best_season ?? "",
                    direction: o.direction ?? "",
                    magnitude: o.magnitude ?? "",
                  });
                  setFormOpen(true);
                }}
                className="rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                수정
              </button>
              <button
                onClick={() => {
                  if (confirm("이 항목을 삭제할까요?")) remove.mutate();
                }}
                className="rounded-sm border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">천체 항목 수정</DialogTitle>
          </DialogHeader>
          <SkyForm
            form={form}
            setForm={setForm}
            pending={save.isPending}
            onSubmit={() => {
              if (!form.name.trim()) {
                toast.error("이름을 입력해 주세요.");
                return;
              }
              save.mutate();
            }}
          />
        </DialogContent>
      </Dialog>
    </MemberShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-5 border-b border-border/60 pb-3">
      <dt className="label-mono w-28 shrink-0">{k}</dt>
      <dd className="min-w-0 break-words text-foreground">{v}</dd>
    </div>
  );
}
