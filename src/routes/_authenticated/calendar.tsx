import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell, useMemberContext } from "@/components/member-shell";
import { formatDateTime, toLocalInput } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "일정 캘린더 — YAAA 연세 아마추어 천문회" },
      { name: "description", content: "관측회 · 번개 관측 · 세미나 등 YAAA 동아리 일정." },
      { property: "og:title", content: "일정 캘린더 — YAAA" },
      { property: "og:description", content: "YAAA 동아리 월별 일정." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

type EventRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
};

const CATEGORIES = ["관측회", "번개 관측", "세미나", "기타"];
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const emptyForm = {
  id: "",
  title: "",
  category: "관측회",
  description: "",
  location: "",
  starts_at: "",
  ends_at: "",
};

function CalendarPage() {
  const { userId, isOfficer } = useMemberContext();
  const queryClient = useQueryClient();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);

  const { data: events } = useQuery({
    queryKey: ["events", cursor.getFullYear(), cursor.getMonth()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, category, description, location, starts_at, ends_at")
        .gte("starts_at", monthStart.toISOString())
        .lt("starts_at", monthEnd.toISOString())
        .order("starts_at");
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const byDay = useMemo(() => {
    const map = new Map<number, EventRow[]>();
    for (const e of events ?? []) {
      const d = new Date(e.starts_at).getDate();
      map.set(d, [...(map.get(d) ?? []), e]);
    }
    return map;
  }, [events]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        created_by: userId,
      };
      const { error } = form.id
        ? await supabase.from("events").update(payload).eq("id", form.id)
        : await supabase.from("events").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("일정이 저장되었습니다.");
      setFormOpen(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("일정이 삭제되었습니다.");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const leading = monthStart.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <MemberShell
      eyebrow="Observation Schedule"
      title="일정 캘린더"
      actions={
        isOfficer ? (
          <button
            onClick={() => {
              setForm(emptyForm);
              setFormOpen(true);
            }}
            className="shrink-0 rounded-sm border border-primary/40 px-4 py-2.5 text-sm text-primary transition-colors hover:bg-primary/10"
          >
            일정 등록
          </button>
        ) : null
      }
    >
      <SheetStrip
        items={[
          { label: "This month", value: String(events?.length ?? 0), accent: "primary" },
          {
            label: "Next event",
            value: (() => {
              const next = (events ?? []).find((e) => new Date(e.starts_at) >= new Date());
              return next ? formatDateTime(next.starts_at) : "—";
            })(),
            accent: "gold",
          },
          {
            label: "Categories",
            value: String(new Set((events ?? []).map((e) => e.category)).size),
          },
          { label: "Booked days", value: String(byDay.size) },
        ]}
      />

      <div className="flex items-center justify-between">
        <p className="font-display text-2xl font-semibold">
          {cursor.getFullYear()}.{String(cursor.getMonth() + 1).padStart(2, "0")}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="h-9 w-9 rounded-sm border border-border font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            ←
          </button>
          <button
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="rounded-sm border border-border px-3 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            TODAY
          </button>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="h-9 w-9 rounded-sm border border-border font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {DAYS.map((d) => (
          <div key={d} className="label-mono bg-background/80 px-2 py-3 text-center">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const isToday =
            day !== null &&
            today.getFullYear() === cursor.getFullYear() &&
            today.getMonth() === cursor.getMonth() &&
            today.getDate() === day;
          return (
            <div
              key={i}
              className={`min-h-28 bg-card/60 p-2 ${day === null ? "opacity-40" : ""}`}
            >
              {day !== null && (
                <>
                  <p
                    className={`font-mono text-xs ${isToday ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {String(day).padStart(2, "0")}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {(byDay.get(day) ?? []).map((e) => (
                      <li key={e.id}>
                        <button
                          onClick={() => setSelected(e)}
                          className="w-full truncate rounded-sm border border-primary/30 bg-primary/10 px-2 py-1 text-left text-xs text-primary transition-colors hover:bg-primary/20"
                        >
                          {e.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <dl className="space-y-4 font-mono text-sm">
                <Row k="CATEGORY" v={selected.category} />
                <Row k="START" v={formatDateTime(selected.starts_at)} />
                {selected.ends_at && <Row k="END" v={formatDateTime(selected.ends_at)} />}
                <Row k="PLACE" v={selected.location ?? "—"} />
              </dl>
              {selected.description && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {selected.description}
                </p>
              )}
              {isOfficer && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setForm({
                        id: selected.id,
                        title: selected.title,
                        category: selected.category,
                        description: selected.description ?? "",
                        location: selected.location ?? "",
                        starts_at: toLocalInput(selected.starts_at),
                        ends_at: selected.ends_at ? toLocalInput(selected.ends_at) : "",
                      });
                      setSelected(null);
                      setFormOpen(true);
                    }}
                    className="rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("이 일정을 삭제할까요?")) remove.mutate(selected.id);
                    }}
                    className="rounded-sm border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {form.id ? "일정 수정" : "일정 등록"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.title.trim() || !form.starts_at) {
                toast.error("제목과 시작 일시를 입력해 주세요.");
                return;
              }
              save.mutate();
            }}
            className="space-y-3"
          >
            <Field
              label="제목"
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v })}
            />
            <div>
              <p className="label-mono mb-2">분류</p>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="시작 일시"
              type="datetime-local"
              value={form.starts_at}
              onChange={(v) => setForm({ ...form, starts_at: v })}
            />
            <Field
              label="종료 일시 (선택)"
              type="datetime-local"
              value={form.ends_at}
              onChange={(v) => setForm({ ...form, ends_at: v })}
            />
            <Field
              label="장소"
              value={form.location}
              onChange={(v) => setForm({ ...form, location: v })}
            />
            <div>
              <p className="label-mono mb-2">설명</p>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full resize-y rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <button
              type="submit"
              disabled={save.isPending}
              className="glow-cyan w-full rounded-sm bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              저장
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </MemberShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-5 border-b border-border/60 pb-3">
      <dt className="label-mono w-24 shrink-0">{k}</dt>
      <dd className="min-w-0 text-foreground">{v}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <p className="label-mono mb-2">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
      />
    </div>
  );
}
