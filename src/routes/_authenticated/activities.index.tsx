import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell, useMemberContext } from "@/components/member-shell";
import { formatDateTime } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActivityForm, emptyActivity, type ActivityFormState } from "@/components/activity-form";

export const Route = createFileRoute("/_authenticated/activities/")({
  head: () => ({
    meta: [
      { title: "동아리 활동 — YAAA 연세 아마추어 천문회" },
      { name: "description", content: "관측회 · 번개 관측 · 세미나 등 YAAA 활동 신청과 기록." },
      { property: "og:title", content: "동아리 활동 — YAAA" },
      { property: "og:description", content: "진행 중인 활동과 완료된 활동 모아보기." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivitiesPage,
});

type ActivityRow = {
  id: string;
  title: string;
  category: string;
  location: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  apply_deadline: string;
  capacity: number | null;
};

function ActivitiesPage() {
  const { userId, profile, isOfficer } = useMemberContext();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"ongoing" | "done">("ongoing");
  const [form, setForm] = useState<ActivityFormState>(emptyActivity);
  const [formOpen, setFormOpen] = useState(false);

  const activities = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select(
          "id, title, category, location, description, starts_at, ends_at, apply_deadline, capacity",
        )
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
  });

  const counts = useQuery({
    queryKey: ["activity-signup-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("activity_signup_counts");
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of (data ?? []) as { activity_id: string; signup_count: number }[]) {
        map.set(row.activity_id, Number(row.signup_count));
      }
      return map;
    },
  });

  const mySignups = useQuery({
    queryKey: ["my-signups", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_signups")
        .select("activity_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.activity_id));
    },
  });

  const now = Date.now();
  const { ongoing, done } = useMemo(() => {
    const list = activities.data ?? [];
    const isDone = (a: ActivityRow) => new Date(a.ends_at ?? a.starts_at).getTime() < now;
    return {
      ongoing: list.filter((a) => !isDone(a)).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
      done: list.filter(isDone),
    };
  }, [activities.data, now]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        apply_deadline: new Date(form.apply_deadline).toISOString(),
        capacity: form.capacity ? Number(form.capacity) : null,
        created_by: userId,
      };
      const { error } = await supabase.from("activities").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("활동이 등록되었습니다.");
      setFormOpen(false);
      setForm(emptyActivity);
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const signUp = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase.from("activity_signups").insert({
        activity_id: activityId,
        user_id: userId!,
        user_name: profile?.full_name ?? "부원",
      });
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = tab === "ongoing" ? ongoing : done;

  return (
    <MemberShell
      eyebrow="Club Activities"
      title="동아리 활동"
      actions={
        isOfficer ? (
          <button
            onClick={() => {
              setForm(emptyActivity);
              setFormOpen(true);
            }}
            className="shrink-0 rounded-sm border border-primary/40 px-4 py-2.5 text-sm text-primary transition-colors hover:bg-primary/10"
          >
            활동 등록
          </button>
        ) : null
      }
    >
      <div className="flex gap-1 border-b border-border">
        {(
          [
            ["ongoing", `진행 중인 활동 · ${ongoing.length}`],
            ["done", `완료된 활동 · ${done.length}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-3 text-sm transition-colors ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="mt-10 font-mono text-sm text-muted-foreground">활동이 없습니다.</p>
      ) : (
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2">
          {list.map((a) => {
            const closed = new Date(a.apply_deadline).getTime() < now;
            const joined = mySignups.data?.has(a.id) ?? false;
            return (
              <article key={a.id} className="flex flex-col bg-card/60 p-7">
                <div className="flex items-center gap-3">
                  <span className="rounded-sm border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[11px] text-primary">
                    {a.category}
                  </span>
                  <span
                    className={`font-mono text-[11px] ${closed ? "text-muted-foreground" : "text-gold"}`}
                  >
                    {closed ? "마감됨" : `마감 ${formatDateTime(a.apply_deadline)}`}
                  </span>
                </div>
                <Link
                  to="/activities/$activityId"
                  params={{ activityId: a.id }}
                  className="mt-3 font-display text-xl font-semibold transition-colors hover:text-primary"
                >
                  {a.title}
                </Link>
                <dl className="mt-4 space-y-2 font-mono text-xs text-muted-foreground">
                  <div>DATE · {formatDateTime(a.starts_at)}</div>
                  <div>PLACE · {a.location ?? "—"}</div>
                  <div>
                    SIGNUPS · {counts.data?.get(a.id) ?? 0}
                    {a.capacity ? ` / ${a.capacity}` : ""}
                  </div>
                </dl>
                {a.description && (
                  <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {a.description}
                  </p>
                )}
                <div className="mt-6 flex gap-2">
                  <button
                    disabled={closed || joined || signUp.isPending}
                    onClick={() =>
                      signUp.mutate(a.id, {
                        onSuccess: () => {
                          toast.success("신청이 완료되었습니다.");
                          queryClient.invalidateQueries({ queryKey: ["my-signups"] });
                          queryClient.invalidateQueries({ queryKey: ["activity-signup-counts"] });
                        },
                      })
                    }
                    className="rounded-sm border border-primary/40 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground"
                  >
                    {joined ? "신청 완료" : closed ? "마감됨" : "신청하기"}
                  </button>
                  <Link
                    to="/activities/$activityId"
                    params={{ activityId: a.id }}
                    className="rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    상세보기
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">활동 등록</DialogTitle>
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
