import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell, useMemberContext } from "@/components/member-shell";
import { SheetStrip } from "@/components/sheet-strip";
import { formatDate } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/equipment")({
  head: () => ({
    meta: [
      { title: "장비 대여 — YAAA 연세 아마추어 천문회" },
      { name: "description", content: "YAAA 관측 장비 목록과 대여 신청 · 반납 관리." },
      { property: "og:title", content: "장비 대여 — YAAA" },
      { property: "og:description", content: "망원경 · 삼각대 · 카메라 등 관측 장비 대여." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EquipmentPage,
});

type EquipmentStatus = "available" | "rented" | "maintenance" | "broken";
type RentalStatus = "pending" | "approved" | "rejected" | "returned" | "cancelled";

type EquipmentRow = {
  id: string;
  name: string;
  category: string;
  status: EquipmentStatus;
  note: string | null;
};

type RentalRow = {
  id: string;
  equipment_id: string;
  user_id: string;
  user_name: string;
  start_date: string;
  end_date: string;
  purpose: string;
  status: RentalStatus;
  return_note: string | null;
  created_at: string;
};

const CATEGORIES = ["망원경", "삼각대", "카메라", "아이피스", "기타"];

const STATUS_LABEL: Record<EquipmentStatus, string> = {
  available: "대여가능",
  rented: "대여중",
  maintenance: "점검중",
  broken: "고장",
};

const STATUS_CLASS: Record<EquipmentStatus, string> = {
  available: "border-primary/40 bg-primary/10 text-primary",
  rented: "border-gold/40 bg-gold/10 text-gold",
  maintenance: "border-border bg-muted/30 text-muted-foreground",
  broken: "border-destructive/40 bg-destructive/10 text-destructive",
};

const RENTAL_LABEL: Record<RentalStatus, string> = {
  pending: "대기중",
  approved: "승인됨",
  rejected: "거절됨",
  returned: "반납완료",
  cancelled: "취소됨",
};

const RENTAL_CLASS: Record<RentalStatus, string> = {
  pending: "text-gold",
  approved: "text-primary",
  rejected: "text-destructive",
  returned: "text-muted-foreground",
  cancelled: "text-muted-foreground",
};

function friendlyError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/exclusion|overlap|no_overlap|23P01/i.test(msg)) {
    return "해당 기간에 이미 신청된 대여가 있습니다. 다른 기간을 선택해 주세요.";
  }
  return msg;
}

const emptyItem = { id: "", name: "", category: "망원경", status: "available" as EquipmentStatus, note: "" };

function EquipmentPage() {
  const { userId, profile, isOfficer } = useMemberContext();
  const queryClient = useQueryClient();

  const [requestFor, setRequestFor] = useState<EquipmentRow | null>(null);
  const [req, setReq] = useState({ start: "", end: "", purpose: "" });
  const [itemForm, setItemForm] = useState(emptyItem);
  const [itemOpen, setItemOpen] = useState(false);

  const items = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, category, status, note")
        .order("category")
        .order("name");
      if (error) throw error;
      return (data ?? []) as EquipmentRow[];
    },
  });

  const rentals = useQuery({
    queryKey: ["rentals", isOfficer ? "all" : userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_rentals")
        .select(
          "id, equipment_id, user_id, user_name, start_date, end_date, purpose, status, return_note, created_at",
        )
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RentalRow[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["equipment"] });
    queryClient.invalidateQueries({ queryKey: ["rentals"] });
    queryClient.invalidateQueries({ queryKey: ["my-rentals"] });
  };

  const request = useMutation({
    mutationFn: async () => {
      if (!requestFor) return;
      const { error } = await supabase.from("equipment_rentals").insert({
        equipment_id: requestFor.id,
        user_id: userId!,
        user_name: profile?.full_name ?? "부원",
        start_date: req.start,
        end_date: req.end,
        purpose: req.purpose.trim(),
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("대여 신청이 접수되었습니다. 운영진 승인을 기다려 주세요.");
      setRequestFor(null);
      setReq({ start: "", end: "", purpose: "" });
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const setRentalStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: RentalStatus;
      note?: string;
    }) => {
      const patch = {
        status,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        ...(status === "returned"
          ? { returned_at: new Date().toISOString(), return_note: note?.trim() || null }
          : {}),
      };
      const { error } = await supabase.from("equipment_rentals").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("대여 상태가 변경되었습니다.");
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const cancelOwn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment_rentals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("신청이 취소되었습니다.");
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const saveItem = useMutation({
    mutationFn: async () => {
      const payload = {
        name: itemForm.name.trim(),
        category: itemForm.category,
        status: itemForm.status,
        note: itemForm.note.trim() || null,
      };
      const { error } = itemForm.id
        ? await supabase.from("equipment").update(payload).eq("id", itemForm.id)
        : await supabase.from("equipment").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("장비 정보가 저장되었습니다.");
      setItemOpen(false);
      setItemForm(emptyItem);
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("장비가 삭제되었습니다.");
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const nameOf = (id: string) => items.data?.find((i) => i.id === id)?.name ?? "—";
  const myRentals = (rentals.data ?? []).filter((r) => r.user_id === userId);

  return (
    <MemberShell
      eyebrow="Equipment Loan"
      title="장비 대여"
      actions={
        isOfficer ? (
          <button
            onClick={() => {
              setItemForm(emptyItem);
              setItemOpen(true);
            }}
            className="shrink-0 rounded-sm border border-primary/40 px-4 py-2.5 text-sm text-primary transition-colors hover:bg-primary/10"
          >
            장비 등록
          </button>
        ) : null
      }
    >
      <SheetStrip
        items={[
          { label: "Inventory", value: String(items.data?.length ?? 0), accent: "primary" },
          {
            label: "Available",
            value: String((items.data ?? []).filter((i) => i.status === "available").length),
          },
          {
            label: "On loan",
            value: String((rentals.data ?? []).filter((r) => r.status === "approved").length),
            accent: "gold",
          },
          {
            label: "Pending",
            value: String((rentals.data ?? []).filter((r) => r.status === "pending").length),
          },
        ]}
      />

      <section>
        <p className="label-mono">Inventory · {items.data?.length ?? 0}</p>
        {(items.data?.length ?? 0) === 0 ? (
          <p className="mt-6 font-mono text-sm text-muted-foreground">등록된 장비가 없습니다.</p>
        ) : (
          <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {items.data!.map((item) => (
              <article key={item.id} className="flex flex-col bg-card/60 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="label-mono">{item.category}</p>
                    <h3 className="mt-2 truncate font-display text-lg font-semibold">
                      {item.name}
                    </h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-sm border px-2.5 py-1 font-mono text-[11px] ${STATUS_CLASS[item.status]}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                {item.note && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.note}</p>
                )}
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    disabled={item.status === "maintenance" || item.status === "broken"}
                    onClick={() => {
                      setReq({ start: "", end: "", purpose: "" });
                      setRequestFor(item);
                    }}
                    className="rounded-sm border border-primary/40 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    대여 신청
                  </button>
                  {isOfficer && (
                    <>
                      <button
                        onClick={() => {
                          setItemForm({
                            id: item.id,
                            name: item.name,
                            category: item.category,
                            status: item.status,
                            note: item.note ?? "",
                          });
                          setItemOpen(true);
                        }}
                        className="rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("이 장비를 삭제할까요? 관련 대여 내역도 함께 삭제됩니다."))
                            removeItem.mutate(item.id);
                        }}
                        className="rounded-sm border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-16">
        <p className="label-mono">
          {isOfficer ? `All Rentals · ${rentals.data?.length ?? 0}` : `My Rentals · ${myRentals.length}`}
        </p>
        {(isOfficer ? rentals.data ?? [] : myRentals).length === 0 ? (
          <p className="mt-6 font-mono text-sm text-muted-foreground">대여 내역이 없습니다.</p>
        ) : (
          <ul className="mt-6 border-t border-border">
            {(isOfficer ? rentals.data! : myRentals).map((r) => (
              <li key={r.id} className="border-b border-border py-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className={`font-mono text-xs ${RENTAL_CLASS[r.status]}`}>
                    {RENTAL_LABEL[r.status]}
                  </span>
                  <span className="font-display text-base">{nameOf(r.equipment_id)}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDate(r.start_date)} → {formatDate(r.end_date)}
                  </span>
                  {isOfficer && (
                    <span className="font-mono text-xs text-muted-foreground">{r.user_name}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.purpose}</p>
                {r.return_note && (
                  <p className="mt-2 font-mono text-xs text-gold">특이사항: {r.return_note}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {isOfficer && r.status === "pending" && (
                    <>
                      <button
                        onClick={() => setRentalStatus.mutate({ id: r.id, status: "approved" })}
                        className="rounded-sm border border-primary/40 px-3 py-1.5 text-xs text-primary hover:bg-primary/10"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => setRentalStatus.mutate({ id: r.id, status: "rejected" })}
                        className="rounded-sm border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                      >
                        거절
                      </button>
                    </>
                  )}
                  {isOfficer && r.status === "approved" && (
                    <button
                      onClick={() => {
                        const note = prompt("반납 특이사항 (파손 · 분실 등, 없으면 비워두세요)") ?? "";
                        setRentalStatus.mutate({ id: r.id, status: "returned", note });
                      }}
                      className="rounded-sm border border-gold/40 px-3 py-1.5 text-xs text-gold hover:bg-gold/10"
                    >
                      반납 완료
                    </button>
                  )}
                  {r.user_id === userId && r.status === "pending" && (
                    <button
                      onClick={() => {
                        if (confirm("신청을 취소할까요?")) cancelOwn.mutate(r.id);
                      }}
                      className="rounded-sm border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      신청 취소
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={Boolean(requestFor)} onOpenChange={(o) => !o && setRequestFor(null)}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {requestFor?.name} 대여 신청
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!req.start || !req.end || !req.purpose.trim()) {
                toast.error("기간과 사용 목적을 모두 입력해 주세요.");
                return;
              }
              if (req.end < req.start) {
                toast.error("반납 예정일은 시작일 이후여야 합니다.");
                return;
              }
              request.mutate();
            }}
            className="space-y-3"
          >
            <Field
              label="대여 시작일"
              type="date"
              value={req.start}
              onChange={(v) => setReq({ ...req, start: v })}
            />
            <Field
              label="반납 예정일"
              type="date"
              value={req.end}
              onChange={(v) => setReq({ ...req, end: v })}
            />
            <div>
              <p className="label-mono mb-2">사용 목적</p>
              <textarea
                rows={3}
                value={req.purpose}
                onChange={(e) => setReq({ ...req, purpose: e.target.value })}
                className="w-full resize-y rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <button
              type="submit"
              disabled={request.isPending}
              className="glow-cyan w-full rounded-sm bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              신청하기
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {itemForm.id ? "장비 수정" : "장비 등록"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!itemForm.name.trim()) {
                toast.error("장비명을 입력해 주세요.");
                return;
              }
              saveItem.mutate();
            }}
            className="space-y-3"
          >
            <Field
              label="장비명"
              value={itemForm.name}
              onChange={(v) => setItemForm({ ...itemForm, name: v })}
            />
            <div>
              <p className="label-mono mb-2">종류</p>
              <select
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                className="w-full rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="label-mono mb-2">상태</p>
              <select
                value={itemForm.status}
                onChange={(e) =>
                  setItemForm({ ...itemForm, status: e.target.value as EquipmentStatus })
                }
                className="w-full rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
              >
                {(Object.keys(STATUS_LABEL) as EquipmentStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="label-mono mb-2">비고</p>
              <textarea
                rows={3}
                value={itemForm.note}
                onChange={(e) => setItemForm({ ...itemForm, note: e.target.value })}
                className="w-full resize-y rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <button
              type="submit"
              disabled={saveItem.isPending}
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
