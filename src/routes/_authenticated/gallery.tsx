import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell, useMemberContext } from "@/components/member-shell";
import { formatDateTime } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SheetStrip } from "@/components/sheet-strip";

export const Route = createFileRoute("/_authenticated/gallery")({
  head: () => ({
    meta: [
      { title: "천체 사진 갤러리 — YAAA 연세 아마추어 천문회" },
      { name: "description", content: "부원들이 직접 찍은 천체 사진을 모아보는 갤러리." },
      { property: "og:title", content: "천체 사진 갤러리 — YAAA" },
      { property: "og:description", content: "사진을 올리면 별가루를 받을 수 있습니다." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GalleryPage,
});

type PhotoRow = {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  caption: string | null;
  shot_at: string | null;
  storage_path: string;
  created_at: string;
  url?: string | undefined;
};

const emptyForm = { title: "", caption: "", shot_at: "" };

function GalleryPage() {
  const { userId, profile, isOfficer } = useMemberContext();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [active, setActive] = useState<PhotoRow | null>(null);

  const photos = useQuery({
    queryKey: ["gallery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("id, user_id, user_name, title, caption, shot_at, storage_path, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as PhotoRow[];
      if (rows.length === 0) return rows;
      const { data: signed } = await supabase.storage
        .from("gallery")
        .createSignedUrls(
          rows.map((r) => r.storage_path),
          60 * 60,
        );
      const map = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
      return rows.map((r) => ({ ...r, url: map.get(r.storage_path) ?? undefined }));
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("사진 파일을 선택해 주세요.");
      if (!form.title.trim()) throw new Error("제목을 입력해 주세요.");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("gallery").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || "image/jpeg",
      });
      if (up.error) throw up.error;
      const { error } = await supabase.from("gallery_photos").insert({
        user_id: userId!,
        user_name: profile?.full_name ?? "부원",
        title: form.title.trim(),
        caption: form.caption.trim() || null,
        shot_at: form.shot_at || null,
        storage_path: path,
      });
      if (error) {
        await supabase.storage.from("gallery").remove([path]);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("사진이 등록되었습니다.");
      setOpen(false);
      setForm(emptyForm);
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
      queryClient.invalidateQueries({ queryKey: ["stardust"] });
      queryClient.invalidateQueries({ queryKey: ["stardust-ledger"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (row: PhotoRow) => {
      const { error } = await supabase.from("gallery_photos").delete().eq("id", row.id);
      if (error) throw error;
      await supabase.storage.from("gallery").remove([row.storage_path]);
    },
    onSuccess: () => {
      toast.success("사진을 삭제했습니다.");
      setActive(null);
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = photos.data ?? [];

  return (
    <MemberShell
      eyebrow="Photo Gallery"
      title="천체 사진 갤러리"
      actions={
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-sm border border-primary/40 px-4 py-2.5 text-sm text-primary transition-colors hover:bg-primary/10"
        >
          사진 올리기
        </button>
      }
    >
      <p className="mb-10 font-mono text-xs text-muted-foreground">
        REWARD · 사진 1장 업로드마다 별가루 1개 (하루 최대 3개)
      </p>



      {photos.isLoading ? (
        <p className="mt-10 font-mono text-sm text-muted-foreground">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="mt-10 font-mono text-sm text-muted-foreground">
          아직 올라온 사진이 없습니다.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setActive(p)}
              className="group overflow-hidden rounded-lg border border-border bg-card/60 text-left transition-colors hover:border-primary/40"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-background">
                <span className="absolute top-2 left-2 z-10 rounded-sm border border-border bg-background/85 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  P-{String(rows.length - i).padStart(3, "0")}
                </span>
                {p.url ? (
                  <img
                    src={p.url}
                    alt={p.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : null}
              </div>
              <div className="p-4">
                <h3 className="font-display text-base font-semibold">{p.title}</h3>
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  {p.user_name} · {p.shot_at ?? formatDateTime(p.created_at)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">사진 올리기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-primary"
            />
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="제목 (예: 오리온 대성운)"
              className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm"
            />
            <input
              type="date"
              value={form.shot_at}
              onChange={(e) => setForm({ ...form, shot_at: e.target.value })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2.5 font-mono text-sm"
            />
            <textarea
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              placeholder="촬영 장비 · 노출 · 한 줄 설명"
              rows={3}
              className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm"
            />
            <button
              disabled={upload.isPending}
              onClick={() => upload.mutate()}
              className="w-full rounded-sm border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            >
              {upload.isPending ? "업로드 중…" : "등록하기"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{active?.title}</DialogTitle>
          </DialogHeader>
          {active?.url && (
            <img src={active.url} alt={active.title} className="w-full rounded-sm" />
          )}
          <dl className="space-y-2 font-mono text-xs text-muted-foreground">
            <div>BY · {active?.user_name}</div>
            <div>SHOT · {active?.shot_at ?? "—"}</div>
            <div>UPLOADED · {active ? formatDateTime(active.created_at) : ""}</div>
          </dl>
          {active?.caption && (
            <p className="text-sm leading-relaxed text-muted-foreground">{active.caption}</p>
          )}
          {active && (active.user_id === userId || isOfficer) && (
            <button
              onClick={() => remove.mutate(active)}
              disabled={remove.isPending}
              className="self-start rounded-sm border border-destructive/40 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              삭제
            </button>
          )}
        </DialogContent>
      </Dialog>
    </MemberShell>
  );
}
