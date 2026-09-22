import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell, useMemberContext } from "@/components/member-shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/room")({
  head: () => ({
    meta: [
      { title: "동아리방 예약 — YAAA 연세 아마추어 천문회" },
      { name: "description", content: "YAAA 동아리방 시간대별 예약 현황과 예약 신청." },
      { property: "og:title", content: "동아리방 예약 — YAAA" },
      { property: "og:description", content: "시간대별 동아리방 예약 현황." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoomPage,
});

type Slot = {
  id: string;
  starts_at: string;
  ends_at: string;
  is_mine: boolean;
  can_manage: boolean;
  user_name: string | null;
  purpose: string | null;
  headcount: number | null;
};

const HOURS = Array.from({ length: 15 }, (_, i) => i + 9); // 09:00 – 23:00

function dateKey(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function friendlyError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/exclusion|overlap|no_overlap|23P01/i.test(msg)) {
    return "이미 예약된 시간대입니다. 다른 시간을 선택해 주세요.";
  }
  return msg;
}

function RoomPage() {
  const { userId, profile } = useMemberContext();
  const queryClient = useQueryClient();

  const today = new Date();
  const [day, setDay] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [form, setForm] = useState({ hour: 9, duration: 1, purpose: "", headcount: "2" });
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<Slot | null>(null);

  const dayStart = new Date(day);
  const dayEnd = new Date(day.getTime() + 24 * 60 * 60 * 1000);

  const slots = useQuery({
    queryKey: ["room-slots", dateKey(day)],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_room_slots", {
        _from: dayStart.toISOString(),
        _to: dayEnd.toISOString(),
      });
      if (error) throw error;
      return (data ?? []) as Slot[];
    },
  });

  const byHour = useMemo(() => {
    const map = new Map<number, Slot>();
    for (const s of slots.data ?? []) {
      const start = new Date(s.starts_at);
      const end = new Date(s.ends_at);
      for (const h of HOURS) {
        const cell = new Date(day);
        cell.setHours(h, 0, 0, 0);
        const cellEnd = new Date(cell.getTime() + 60 * 60 * 1000);
        if (cell < end && cellEnd > start) map.set(h, s);
      }
    }
    return map;
  }, [slots.data, day]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["room-slots"] });
    queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
  };

  const book = useMutation({
    mutationFn: async () => {
      const starts = new Date(day);
      starts.setHours(form.hour, 0, 0, 0);
      const ends = new Date(starts.getTime() + form.duration * 60 * 60 * 1000);
      const { error } = await supabase.from("room_reservations").insert({
        user_id: userId!,
        user_name: profile?.full_name ?? "부원",
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        purpose: form.purpose.trim(),
        headcount: Number(form.headcount) || 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("예약이 완료되었습니다.");
      setFormOpen(false);
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("room_reservations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("예약이 취소되었습니다.");
      setDetail(null);
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const shift = (n: number) => setDay(new Date(day.getTime() + n * 24 * 60 * 60 * 1000));

  return (
    <MemberShell eyebrow="Clubroom Booking" title="동아리방 예약">
      <div className="flex items-center justify-between">
        <p className="font-display text-2xl font-semibold">
          {dateKey(day).replace(/-/g, ".")}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => shift(-1)}
            className="h-9 w-9 rounded-sm border border-border font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            ←
          </button>
          <button
            onClick={() => setDay(new Date(today.getFullYear(), today.getMonth(), today.getDate()))}
            className="rounded-sm border border-border px-3 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            TODAY
          </button>
          <button
            onClick={() => shift(1)}
            className="h-9 w-9 rounded-sm border border-border font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            →
          </button>
        </div>
      </div>

      <ul className="mt-8 overflow-hidden rounded-lg border border-border">
        {HOURS.map((h) => {
          const taken = byHour.get(h);
          const label = `${String(h).padStart(2, "0")}:00`;
          return (
            <li key={h} className="border-b border-border last:border-b-0">
              <button
                onClick={() => {
                  if (taken) {
                    setDetail(taken);
                    return;
                  }
                  setForm({ hour: h, duration: 1, purpose: "", headcount: "2" });
                  setFormOpen(true);
                }}
                className={`flex w-full items-center gap-5 px-5 py-4 text-left transition-colors ${
                  taken
                    ? taken.is_mine
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "bg-muted/30 text-muted-foreground"
                    : "bg-card/40 hover:bg-primary/10"
                }`}
              >
                <span className="font-mono text-xs opacity-80">{label}</span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {taken
                    ? taken.can_manage
                      ? `${taken.user_name} · ${taken.purpose}`
                      : "예약됨"
                    : "예약 가능"}
                </span>
                <span className="font-mono text-[11px] opacity-70">
                  {taken ? "BOOKED" : "OPEN"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {dateKey(day).replace(/-/g, ".")} {String(form.hour).padStart(2, "0")}:00 예약
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.purpose.trim()) {
                toast.error("사용 목적을 입력해 주세요.");
                return;
              }
              book.mutate();
            }}
            className="space-y-3"
          >
            <div>
              <p className="label-mono mb-2">사용 시간</p>
              <select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                className="w-full rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
              >
                {[1, 2, 3, 4].map((d) => (
                  <option key={d} value={d}>
                    {d}시간
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="label-mono mb-2">예상 인원</p>
              <input
                type="number"
                min={1}
                max={100}
                value={form.headcount}
                onChange={(e) => setForm({ ...form, headcount: e.target.value })}
                className="w-full rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <p className="label-mono mb-2">사용 목적</p>
              <textarea
                rows={3}
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                className="w-full resize-y rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <button
              type="submit"
              disabled={book.isPending}
              className="glow-cyan w-full rounded-sm bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              예약하기
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">예약 정보</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-5">
              <dl className="space-y-4 font-mono text-sm">
                <Row
                  k="TIME"
                  v={`${new Date(detail.starts_at).toTimeString().slice(0, 5)} – ${new Date(detail.ends_at).toTimeString().slice(0, 5)}`}
                />
                {detail.can_manage ? (
                  <>
                    <Row k="MEMBER" v={detail.user_name ?? "—"} />
                    <Row k="HEADCOUNT" v={String(detail.headcount ?? "—")} />
                    <Row k="PURPOSE" v={detail.purpose ?? "—"} />
                  </>
                ) : (
                  <Row k="STATUS" v="다른 부원이 예약한 시간입니다." />
                )}
              </dl>
              {detail.can_manage && (
                <button
                  onClick={() => {
                    if (confirm("이 예약을 취소할까요?")) cancel.mutate(detail.id);
                  }}
                  className="rounded-sm border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  예약 취소
                </button>
              )}
            </div>
          )}
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
