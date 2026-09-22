import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell, useMemberContext } from "@/components/member-shell";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/_authenticated/board/$board/")({
  head: () => ({
    meta: [
      { title: "게시판 — YAAA 연세 아마추어 천문회" },
      { name: "description", content: "YAAA 부원 전용 공지사항 · 자유게시판." },
      { property: "og:title", content: "게시판 — YAAA" },
      { property: "og:description", content: "YAAA 부원 전용 게시판." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BoardList,
});

function BoardList() {
  const { board } = useParams({ from: "/_authenticated/board/$board/" });
  const kind = board === "notice" ? "notice" : "free";
  const { userId, profile, isOfficer } = useMemberContext();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const canWrite = kind === "free" || isOfficer;

  const { data, isLoading } = useQuery({
    queryKey: ["posts", kind, page],
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from("posts")
        .select("id, title, author_name, created_at, view_count", { count: "exact" })
        .eq("board", kind)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  // 마지막 접속 시각 (게시판별) — 화면 진입 시 이전 값을 읽고 현재 시각으로 갱신
  const [since, setSince] = useState<string | null>(null);
  useEffect(() => {
    const key = `board-visit:${kind}`;
    const prev = window.localStorage.getItem(key);
    setSince(prev);
    window.localStorage.setItem(key, new Date().toISOString());
  }, [kind]);

  const newCount = useQuery({
    queryKey: ["posts-new", kind, since],
    queryFn: async () => {
      let q = supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("board", kind);
      if (since) q = q.gt("created_at", since);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    enabled: typeof window !== "undefined",
  });



  const create = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("로그인이 필요합니다.");
      const { error } = await supabase.from("posts").insert({
        board: kind,
        title: title.trim(),
        body: body.trim(),
        author_id: userId,
        author_name: profile?.full_name ?? "부원",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("글이 등록되었습니다.");
      setTitle("");
      setBody("");
      setOpen(false);
      setPage(0);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));

  return (
    <MemberShell
      eyebrow={kind === "notice" ? "Notices" : "Community"}
      title={kind === "notice" ? "공지사항" : "자유게시판"}
      actions={
        canWrite ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-sm border border-primary/40 px-4 py-2.5 text-sm text-primary transition-colors hover:bg-primary/10"
          >
            {open ? "취소" : "글쓰기"}
          </button>
        ) : null
      }
    >
      {/* 왼쪽 세로선 캡션 */}
      <div className="mb-10 border-l-2 border-primary/40 pl-4">
        <p className="font-mono text-xs tracking-[0.12em] text-muted-foreground">
          NEW POSTS{" "}
          <span className="text-primary">
            {newCount.data === undefined ? "—" : newCount.data}
          </span>
        </p>
        <p className="mt-1 font-mono text-xs tracking-[0.12em] text-muted-foreground">
          LATEST{" "}
          <span className="text-foreground">
            {data?.rows[0] ? formatDate(data.rows[0].created_at) : "—"}
          </span>
        </p>
      </div>





      {open && canWrite && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !body.trim()) {
              toast.error("제목과 본문을 입력해 주세요.");
              return;
            }
            create.mutate();
          }}
          className="hairline mb-12 rounded-lg bg-card/60 p-6"
        >
          <p className="label-mono">New Post</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="mt-4 w-full rounded-sm border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary/50"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="본문"
            rows={7}
            className="mt-3 w-full resize-y rounded-sm border border-input bg-background/60 px-4 py-3 text-sm leading-relaxed outline-none focus:border-primary/50"
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="glow-cyan mt-4 rounded-sm bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {create.isPending ? "등록 중…" : "등록"}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="font-mono text-sm text-muted-foreground">LOADING…</p>
      ) : (data?.rows.length ?? 0) === 0 ? (
        <p className="font-mono text-sm text-muted-foreground">아직 등록된 글이 없습니다.</p>
      ) : (
        <ul className="border-t border-border">
          {data!.rows.map((p, i) => (
            <li key={p.id} className="border-b border-border">
              <Link
                to="/board/$board/$postId"
                params={{ board: kind, postId: p.id }}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5 py-5 transition-colors hover:text-primary sm:grid-cols-[auto_minmax(0,1fr)_auto]"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {String(data!.count - page * PAGE_SIZE - i).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base">{p.title}</span>
                  <span className="mt-1 block font-mono text-xs text-muted-foreground">
                    {p.author_name}
                  </span>
                </span>
                <span className="col-span-2 font-mono text-xs text-muted-foreground sm:col-span-1 sm:text-right">
                  {formatDate(p.created_at)} · VIEWS {String(p.view_count).padStart(3, "0")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex items-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-9 w-9 rounded-sm font-mono text-xs transition-colors ${
                i === page
                  ? "border border-primary/50 text-primary"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </MemberShell>
  );
}
