import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell, useMemberContext } from "@/components/member-shell";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/board/$board/$postId")({
  head: () => ({
    meta: [
      { title: "게시글 — YAAA 연세 아마추어 천문회" },
      { name: "description", content: "YAAA 부원 게시판 글 상세." },
      { property: "og:title", content: "게시글 — YAAA" },
      { property: "og:description", content: "YAAA 부원 게시판 글 상세." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostDetail,
});

function PostDetail() {
  const { board, postId } = useParams({ from: "/_authenticated/board/$board/$postId" });
  const kind = board === "notice" ? "notice" : "free";
  const { userId, profile, isAdmin } = useMemberContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    supabase.rpc("increment_post_view", { _post_id: postId });
  }, [postId]);

  const post = useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("*").eq("id", postId).single();
      if (error) throw error;
      return data;
    },
  });

  const comments = useQuery({
    queryKey: ["comments", postId],
    enabled: kind === "free",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("posts")
        .update({ title: title.trim(), body: body.trim() })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("수정되었습니다.");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      navigate({ to: "/board/$board", params: { board: kind } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("로그인이 필요합니다.");
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId,
        author_id: userId,
        author_name: profile?.full_name ?? "부원",
        body: comment.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("post_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", postId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const data = post.data;
  const owner = Boolean(data && userId && data.author_id === userId);
  const canEdit = owner;
  const canDelete = owner || isAdmin;

  return (
    <MemberShell
      eyebrow={kind === "notice" ? "Notice" : "Community"}
      title={data?.title ?? "게시글"}
      actions={
        <Link
          to="/board/$board"
          params={{ board: kind }}
          className="shrink-0 rounded-sm border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          목록
        </Link>
      }
    >
      {post.isLoading ? (
        <p className="font-mono text-sm text-muted-foreground">LOADING…</p>
      ) : !data ? (
        <p className="font-mono text-sm text-muted-foreground">글을 찾을 수 없습니다.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border pb-6 font-mono text-xs text-muted-foreground">
            <span className="text-foreground">{data.author_name}</span>
            <span>{formatDateTime(data.created_at)}</span>
            <span>VIEWS {String(data.view_count).padStart(3, "0")}</span>
          </div>

          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                update.mutate();
              }}
              className="mt-8"
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-sm border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary/50"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="mt-3 w-full resize-y rounded-sm border border-input bg-background/60 px-4 py-3 text-sm leading-relaxed outline-none focus:border-primary/50"
              />
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  className="glow-cyan rounded-sm bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-sm border border-border px-5 py-2.5 text-sm text-muted-foreground"
                >
                  취소
                </button>
              </div>
            </form>
          ) : (
            <article className="mt-8 text-sm leading-[1.9] whitespace-pre-wrap text-muted-foreground">
              {data.body}
            </article>
          )}

          {(canEdit || canDelete) && !editing && (
            <div className="mt-10 flex gap-2">
              {canEdit && (
                <button
                  onClick={() => {
                    setTitle(data.title);
                    setBody(data.body);
                    setEditing(true);
                  }}
                  className="rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  수정
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => {
                    if (confirm("이 글을 삭제할까요?")) remove.mutate();
                  }}
                  className="rounded-sm border border-destructive/40 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  삭제
                </button>
              )}
            </div>
          )}

          {kind === "free" && (
            <section className="mt-20">
              <p className="label-mono">Comments · {comments.data?.length ?? 0}</p>
              <ul className="mt-6 border-t border-border">
                {(comments.data ?? []).map((c) => (
                  <li key={c.id} className="border-b border-border py-5">
                    <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-muted-foreground">
                      <span className="text-foreground">{c.author_name}</span>
                      <span>{formatDateTime(c.created_at)}</span>
                      {(c.author_id === userId || isAdmin) && (
                        <button
                          onClick={() => removeComment.mutate(c.id)}
                          className="text-destructive hover:underline"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{c.body}</p>
                  </li>
                ))}
              </ul>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!comment.trim()) return;
                  addComment.mutate();
                }}
                className="mt-6 flex flex-col gap-3 sm:flex-row"
              >
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder="댓글을 남겨 주세요"
                  className="min-w-0 flex-1 resize-y rounded-sm border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary/50"
                />
                <button
                  type="submit"
                  className="shrink-0 self-start rounded-sm border border-primary/40 px-5 py-3 text-sm text-primary transition-colors hover:bg-primary/10"
                >
                  등록
                </button>
              </form>
            </section>
          )}
        </>
      )}
    </MemberShell>
  );
}
