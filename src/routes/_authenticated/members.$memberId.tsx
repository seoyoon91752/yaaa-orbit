import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell } from "@/components/member-shell";
import { formatDate, formatDateTime } from "@/lib/format";
import { initialOf } from "@/lib/avatars";
import { useMembers } from "./members.index";

export const Route = createFileRoute("/_authenticated/members/$memberId")({
  head: () => ({
    meta: [
      { title: "부원 상세 — YAAA 연세 아마추어 천문회" },
      { name: "description", content: "부원이 연 활동과 올린 천체 사진 기록." },
      { property: "og:title", content: "부원 상세 — YAAA" },
      { property: "og:description", content: "부원별 활동과 갤러리 기록." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MemberDetail,
});

function MemberDetail() {
  const { memberId } = Route.useParams();
  const members = useMembers();
  const member = members.data?.find((m) => m.id === memberId);
  const name = member?.full_name ?? "부원";

  const activities = useQuery({
    queryKey: ["member-activities", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id, title, category, location, starts_at")
        .eq("created_by", memberId)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const photos = useQuery({
    queryKey: ["member-gallery", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("id, title, shot_at, created_at, storage_path")
        .eq("user_id", memberId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [] as ((typeof rows)[number] & { url: string | null })[];
      const { data: signed } = await supabase.storage
        .from("gallery")
        .createSignedUrls(
          rows.map((r) => r.storage_path),
          60 * 60,
        );
      const map = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
      return rows.map((r) => ({ ...r, url: map.get(r.storage_path) ?? null }));
    },
  });

  return (
    <MemberShell eyebrow="Member Profile" title={name}>
      <Link to="/members" className="font-mono text-xs text-muted-foreground hover:text-foreground">
        ← 부원 목록
      </Link>

      <section className="mt-8 flex items-center gap-5 rounded-lg border border-border bg-card/60 p-7">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
          {member?.avatar_url ? (
            <img src={member.avatar_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-2xl text-muted-foreground">{initialOf(name)}</span>
          )}
        </span>
        <div>
          <p className="font-display text-2xl font-semibold">{name}</p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {member?.department ?? "학과 미등록"}
            {member?.cohort ? ` · ${member.cohort}` : ""}
          </p>
        </div>
      </section>

      <section className="mt-14">
        <p className="label-mono">{name}의 활동 · {activities.data?.length ?? 0}</p>
        {(activities.data?.length ?? 0) === 0 ? (
          <p className="mt-6 font-mono text-sm text-muted-foreground">개설한 활동이 없습니다.</p>
        ) : (
          <ul className="mt-6 border-t border-border">
            {activities.data!.map((a) => (
              <li key={a.id} className="border-b border-border">
                <Link
                  to="/activities/$activityId"
                  params={{ activityId: a.id }}
                  className="flex flex-wrap items-center gap-x-5 gap-y-1 py-4 transition-colors hover:text-primary"
                >
                  <span className="label-mono">{a.category}</span>
                  <span className="text-sm">{a.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDateTime(a.starts_at)}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {a.location ?? "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <p className="label-mono">{name}의 갤러리 · {photos.data?.length ?? 0}</p>
        {(photos.data?.length ?? 0) === 0 ? (
          <p className="mt-6 font-mono text-sm text-muted-foreground">올린 사진이 없습니다.</p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {photos.data!.map((p) => (
              <article key={p.id} className="overflow-hidden rounded-lg border border-border bg-card/60">
                <div className="aspect-[4/3] w-full overflow-hidden bg-background">
                  {p.url ? (
                    <img src={p.url} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="font-display text-base font-semibold">{p.title}</h3>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {p.shot_at ?? formatDate(p.created_at)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </MemberShell>
  );
}
