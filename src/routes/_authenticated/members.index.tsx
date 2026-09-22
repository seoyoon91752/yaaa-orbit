import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell } from "@/components/member-shell";
import { signAvatars } from "@/lib/avatars";
import { ConstellationAvatar } from "@/components/constellation-avatar";
import { SheetStrip } from "@/components/sheet-strip";

export const Route = createFileRoute("/_authenticated/members/")({
  head: () => ({
    meta: [
      { title: "부원 프로필 — YAAA 연세 아마추어 천문회" },
      { name: "description", content: "YAAA 부원 명단과 각자의 활동 · 사진 기록." },
      { property: "og:title", content: "부원 프로필 — YAAA" },
      { property: "og:description", content: "부원별 활동과 갤러리 기록 모아보기." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MembersPage,
});

export type MemberRow = {
  id: string;
  full_name: string;
  department: string | null;
  cohort: string | null;
  avatar_path: string | null;
};

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_members");
      if (error) throw error;
      const rows = (data ?? []) as MemberRow[];
      const signed = await signAvatars(rows.map((r) => r.avatar_path));
      return rows.map((r) => ({
        ...r,
        avatar_url: r.avatar_path ? (signed.get(r.avatar_path) ?? null) : null,
      }));
    },
  });
}

function MembersPage() {
  const members = useMembers();
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const rows = members.data ?? [];
    const term = q.trim();
    if (!term) return rows;
    return rows.filter(
      (m) => m.full_name.includes(term) || (m.department ?? "").includes(term),
    );
  }, [members.data, q]);

  return (
    <MemberShell eyebrow="Member Directory" title="부원 프로필">

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="이름 또는 학과 검색"
        className="w-full max-w-sm rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
      />

      {members.isLoading ? (
        <p className="mt-10 font-mono text-sm text-muted-foreground">불러오는 중…</p>
      ) : list.length === 0 ? (
        <p className="mt-10 font-mono text-sm text-muted-foreground">부원이 없습니다.</p>
      ) : (
        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m, i) => (
            <Link
              key={m.id}
              to="/members/$memberId"
              params={{ memberId: m.id }}
              className="relative flex items-center gap-4 bg-card/60 p-5 transition-colors hover:bg-card"
            >
              <span className="absolute top-2.5 right-3 font-mono text-[10px] text-muted-foreground/70">
                {String(i + 1).padStart(3, "0")}
              </span>
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.full_name} className="h-full w-full object-cover" />
                ) : (
                  <ConstellationAvatar seed={m.id} />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-base font-semibold">
                  {m.full_name}
                </span>
                <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">
                  {m.department ?? "학과 미등록"}
                  {m.cohort ? ` · ${m.cohort}` : ""}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </MemberShell>
  );
}
