import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell, useMemberContext } from "@/components/member-shell";
import { formatDateTime, toLocalInput } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActivityForm, emptyActivity, type ActivityFormState } from "@/components/activity-form";

export const Route = createFileRoute("/_authenticated/activities/$activityId")({
  head: () => ({
    meta: [
      { title: "활동 상세 — YAAA 연세 아마추어 천문회" },
      { name: "description", content: "YAAA 동아리 활동 상세 정보와 신청." },
      { property: "og:title", content: "활동 상세 — YAAA" },
      { property: "og:description", content: "활동 일정 · 장소 · 신청 마감 안내." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityDetail,
  errorComponent: () => (
    <MemberShell eyebrow="Activity" title="활동">
      <p className="font-mono text-sm text-destructive">활동을 불러오지 못했습니다.</p>
    </MemberShell>
  ),
  notFoundComponent: () => (
    <MemberShell eyebrow="Activity" title="활동">
      <p className="font-mono text-sm text-muted-foreground">활동을 찾을 수 없습니다.</p>
    </MemberShell>
  ),
});

function ActivityDetail() {
  const { activityId } = Route.useParams();
  const { userId, profile, isOfficer } = useMemberContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<ActivityFormState>(emptyActivity);
  const [formOpen, setFormOpen] = useState(false);

  const activity = useQuery({
    queryKey: ["activity", activityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("id", activityId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const signups = useQuery({
    queryKey: ["activity-signups", activityId, userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_signups")
        .select("id, user_id, user_name, attended, created_at")
        .eq("activity_id", activityId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["activity-signups"] });
    queryClient.invalidateQueries({ queryKey: ["my-signups"] });
    queryClient.invalidateQueries({ queryKey: ["my-activities"] });
    queryClient.invalidateQueries({ queryKey: ["activity-signup-counts"] });
  };

  const mine = signups.data?.find((s) => s.user_id === userId) ?? null;
  const a = activity.data;
  const closed = a ? new Date(a.apply_deadline).getTime() < Date.now() : true;

  const join = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activity_signups").insert({
        activity_id: activityId,
        user_id: userId!,
        user_name: profile?.full_name ?? "부원",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("신청이 완료되었습니다.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const leave = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activity_signups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("신청이 취소되었습니다.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAttend = useMutation({
    mutationFn: async ({ id, attended }: { id: string; attended: boolean }) => {
      const { error } = await supabase
        .from("activity_signups")
        .update({ attended, attended_at: attended ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      if (v.attended) toast.success("출석 확인 · 별가루가 지급되었습니다.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("activities")
        .update({
          title: form.title.trim(),
          category: form.category,
          location: form.location.trim() || null,
          description: form.description.trim() || null,
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          apply_deadline: new Date(form.apply_deadline).toISOString(),
          capacity: form.capacity ? Number(form.capacity) : null,
          stardust_reward: form.stardust_reward ? Number(form.stardust_reward) : 1,
        })
        .eq("id", activityId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("활동이 수정되었습니다.");
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activities").delete().eq("id", activityId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("활동이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      navigate({ to: "/activities" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MemberShell eyebrow="Activity" title={a?.title ?? "활동"}>
      <Link
        to="/activities"
        className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        ← 활동 목록
      </Link>

      {a && (
        <>
          <div className="hairline mt-6 rounded-lg bg-card/60 p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-sm border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[11px] text-primary">
                {a.category}
              </span>
              <span
                className={`font-mono text-[11px] ${closed ? "text-muted-foreground" : "text-gold"}`}
              >
                {closed ? "신청 마감됨" : `신청 마감 ${formatDateTime(a.apply_deadline)}`}
              </span>
            </div>

            <dl className="mt-6 space-y-4 font-mono text-sm">
              <Row k="DATE" v={formatDateTime(a.starts_at)} />
              {a.ends_at && <Row k="UNTIL" v={formatDateTime(a.ends_at)} />}
              <Row k="PLACE" v={a.location ?? "—"} />
              <Row
                k="SIGNUPS"
                v={`${signups.data?.length ?? 0}${a.capacity ? ` / ${a.capacity}` : ""}`}
              />
              <Row k="STARDUST" v={`출석 시 별가루 ${a.stardust_reward ?? 1}개`} />
            </dl>

            {a.description && (
              <p className="mt-6 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {a.description}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-2">
              {mine ? (
                <>
                  <span className="rounded-sm border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary">
                    신청 완료{mine.attended ? " · 출석 확인됨" : ""}
                  </span>
                  {!closed && (
                    <button
                      onClick={() => {
                        if (confirm("신청을 취소할까요?")) leave.mutate(mine.id);
                      }}
                      className="rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      신청 취소
                    </button>
                  )}
                </>
              ) : (
                <button
                  disabled={closed || join.isPending}
                  onClick={() => join.mutate()}
                  className="rounded-sm border border-primary/40 px-5 py-2 text-sm text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground"
                >
                  {closed ? "마감됨" : "신청하기"}
                </button>
              )}

              {isOfficer && (
                <>
                  <button
                    onClick={() => {
                      setForm({
                        id: a.id,
                        title: a.title,
                        category: a.category,
                        location: a.location ?? "",
                        description: a.description ?? "",
                        starts_at: toLocalInput(a.starts_at),
                        ends_at: a.ends_at ? toLocalInput(a.ends_at) : "",
                        apply_deadline: toLocalInput(a.apply_deadline),
                        capacity: a.capacity ? String(a.capacity) : "",
                        stardust_reward: String(a.stardust_reward ?? 1),
                      });
                      setFormOpen(true);
                    }}
                    className="rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("이 활동을 삭제할까요? 신청 내역도 함께 삭제됩니다."))
                        remove.mutate();
                    }}
                    className="rounded-sm border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </div>

          {isOfficer && (
            <section className="mt-14">
              <p className="label-mono">Signups · {signups.data?.length ?? 0}</p>
              {(signups.data?.length ?? 0) === 0 ? (
                <p className="mt-6 font-mono text-sm text-muted-foreground">신청자가 없습니다.</p>
              ) : (
                <ul className="mt-6 border-t border-border">
                  {signups.data!.map((s, i) => (
                    <li
                      key={s.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-5 border-b border-border py-4"
                    >
                      <span className="label-mono">{String(i + 1).padStart(2, "0")}</span>
                      <span className="truncate text-sm">{s.user_name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatDateTime(s.created_at)}
                      </span>
                      <label className="flex shrink-0 cursor-pointer items-center gap-2 font-mono text-xs">
                        <input
                          type="checkbox"
                          checked={s.attended}
                          onChange={(e) =>
                            toggleAttend.mutate({ id: s.id, attended: e.target.checked })
                          }
                          className="size-4 accent-[oklch(0.8_0.15_200)]"
                        />
                        <span className={s.attended ? "text-primary" : "text-muted-foreground"}>
                          출석
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">활동 수정</DialogTitle>
          </DialogHeader>
          <ActivityForm
            form={form}
            setForm={setForm}
            pending={save.isPending}
            onSubmit={() => {
              if (!form.title.trim() || !form.starts_at || !form.apply_deadline) {
                toast.error("제목 · 일시 · 신청 마감일을 입력해 주세요.");
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
