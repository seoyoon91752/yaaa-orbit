import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMembership, useSession, type MemberProfile } from "@/hooks/use-session";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "운영진 콘솔 — YAAA" },
      { name: "description", content: "YAAA 부원 명부 관리와 가입 승인을 처리하는 운영진 페이지." },
      { property: "og:title", content: "운영진 콘솔 — YAAA" },
      { property: "og:description", content: "부원 명부 관리 및 가입 승인." },
    ],
  }),
  component: AdminPage,
});

type RosterRow = {
  id: string;
  full_name: string;
  student_id: string;
  cohort: string | null;
  department: string | null;
};

function AdminPage() {
  const { session } = useSession();
  const membership = useMembership(Boolean(session));
  const isAdmin = membership.data?.isAdmin;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <p className="label-mono">Operations</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">운영진 콘솔</h1>

        {membership.isLoading ? (
          <p className="mt-8 font-mono text-sm text-muted-foreground">LOADING…</p>
        ) : !isAdmin ? (
          <div className="mt-10 hairline rounded-lg bg-card/60 p-8">
            <p className="text-sm text-muted-foreground">
              관리자 권한이 없습니다. 운영진에게 권한 부여를 요청하세요.
            </p>
            <Link to="/dashboard" className="mt-4 inline-block text-sm text-primary">
              ← 부원 홈으로
            </Link>
          </div>
        ) : (
          <div className="mt-12 space-y-16">
            <RosterSection />
            <ApprovalSection />
            <RoleSection />
          </div>
        )}
      </main>
    </div>
  );
}

function RosterSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    full_name: "",
    student_id: "",
    cohort: "",
    department: "",
  });

  const roster = useQuery({
    queryKey: ["roster"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster")
        .select("id, full_name, student_id, cohort, department")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RosterRow[];
    },
  });

  const addMember = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("roster").insert({
        full_name: form.full_name.trim(),
        student_id: form.student_id.trim(),
        cohort: form.cohort.trim() || null,
        department: form.department.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("명부에 등록했습니다.");
      setForm({ full_name: "", student_id: "", cohort: "", department: "" });
      queryClient.invalidateQueries({ queryKey: ["roster"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roster").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("삭제했습니다.");
      queryClient.invalidateQueries({ queryKey: ["roster"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RosterRow> }) => {
      const { error } = await supabase.from("roster").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("수정했습니다.");
      queryClient.invalidateQueries({ queryKey: ["roster"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section>
      <header className="flex items-baseline justify-between border-b border-border pb-4">
        <h2 className="text-xl font-semibold">부원 명부</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {(roster.data?.length ?? 0).toString().padStart(3, "0")} RECORDS
        </span>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addMember.mutate();
        }}
        className="mt-6 grid gap-3 sm:grid-cols-5"
      >
        <Input
          placeholder="이름"
          value={form.full_name}
          onChange={(v) => setForm({ ...form, full_name: v })}
          required
        />
        <Input
          placeholder="학번"
          value={form.student_id}
          onChange={(v) => setForm({ ...form, student_id: v })}
          mono
          required
        />
        <Input
          placeholder="기수 (선택)"
          value={form.cohort}
          onChange={(v) => setForm({ ...form, cohort: v })}
        />
        <Input
          placeholder="학과 (선택)"
          value={form.department}
          onChange={(v) => setForm({ ...form, department: v })}
        />
        <button
          type="submit"
          disabled={addMember.isPending}
          className="rounded-sm bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          명부 등록
        </button>
      </form>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {["이름", "학번", "기수", "학과", ""].map((h) => (
                <th key={h} className="label-mono py-3 pr-4 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(roster.data ?? []).map((row) => (
              <tr key={row.id} className="border-b border-border/60">
                <EditableCell
                  value={row.full_name}
                  onSave={(v) => updateMember.mutate({ id: row.id, patch: { full_name: v } })}
                />
                <EditableCell
                  mono
                  value={row.student_id}
                  onSave={(v) => updateMember.mutate({ id: row.id, patch: { student_id: v } })}
                />
                <EditableCell
                  mono
                  value={row.cohort ?? ""}
                  onSave={(v) => updateMember.mutate({ id: row.id, patch: { cohort: v } })}
                />
                <EditableCell
                  value={row.department ?? ""}
                  onSave={(v) => updateMember.mutate({ id: row.id, patch: { department: v } })}
                />
                <td className="py-2 text-right">
                  <button
                    onClick={() => removeMember.mutate(row.id)}
                    className="text-xs text-muted-foreground transition-colors hover:text-destructive"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {roster.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-sm text-muted-foreground">
                  등록된 명부가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ApprovalSection() {
  const queryClient = useQueryClient();

  const pending = useQuery({
    queryKey: ["pending-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, student_id, email, status, created_at")
        .neq("status", "verified")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as MemberProfile[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "verified" | "rejected" }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-profiles"] });
      toast.success("처리했습니다.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section>
      <header className="flex items-baseline justify-between border-b border-border pb-4">
        <h2 className="text-xl font-semibold">가입 승인 대기</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {(pending.data?.length ?? 0).toString().padStart(3, "0")} PENDING
        </span>
      </header>

      <div className="mt-6 space-y-3">
        {(pending.data ?? []).map((p) => (
          <div
            key={p.id}
            className="hairline flex flex-wrap items-center justify-between gap-4 rounded-md bg-card/60 px-5 py-4"
          >
            <div>
              <p className="text-sm font-medium">
                {p.full_name}{" "}
                <span className="font-mono text-xs text-muted-foreground">{p.student_id}</span>
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {p.email} · {new Date(p.created_at).toISOString().slice(0, 10)} · {p.status}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => decide.mutate({ id: p.id, status: "verified" })}
                className="rounded-sm border border-primary/40 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
              >
                승인
              </button>
              <button
                onClick={() => decide.mutate({ id: p.id, status: "rejected" })}
                className="rounded-sm border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
              >
                거절
              </button>
            </div>
          </div>
        ))}
        {pending.data?.length === 0 && (
          <p className="py-6 text-sm text-muted-foreground">대기 중인 신청이 없습니다.</p>
        )}
      </div>
    </section>
  );
}

function RoleSection() {
  const queryClient = useQueryClient();

  const members = useQuery({
    queryKey: ["member-roles"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles, error: roleError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, student_id, email, status, created_at")
          .eq("status", "verified")
          .order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      if (roleError) throw roleError;
      const byUser = new Map<string, string[]>();
      for (const r of roles ?? []) {
        byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]);
      }
      return (profiles as MemberProfile[]).map((p) => ({
        ...p,
        roles: byUser.get(p.id) ?? [],
      }));
    },
  });

  const setOfficer = useMutation({
    mutationFn: async ({ id, make }: { id: string; make: boolean }) => {
      if (make) {
        const { error } = await supabase.from("user_roles").insert({ user_id: id, role: "officer" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", id)
          .eq("role", "officer");
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("역할을 변경했습니다.");
      queryClient.invalidateQueries({ queryKey: ["member-roles"] });
      queryClient.invalidateQueries({ queryKey: ["membership"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section>
      <header className="flex items-baseline justify-between border-b border-border pb-4">
        <h2 className="text-xl font-semibold">역할 관리</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {(members.data?.length ?? 0).toString().padStart(3, "0")} MEMBERS
        </span>
      </header>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        임원진은 공지사항 작성과 일정 등록, 동아리방 예약 관리만 할 수 있습니다. 명부 관리, 가입
        승인, 역할 지정, 자유게시판 글 강제 삭제는 최고관리자 전용입니다.
      </p>

      <div className="mt-6 space-y-3">
        {(members.data ?? []).map((m) => {
          const admin = m.roles.includes("admin");
          const officer = m.roles.includes("officer");
          return (
            <div
              key={m.id}
              className="hairline flex flex-wrap items-center justify-between gap-4 rounded-md bg-card/60 px-5 py-4"
            >
              <div>
                <p className="text-sm font-medium">
                  {m.full_name}{" "}
                  <span className="font-mono text-xs text-muted-foreground">{m.student_id}</span>
                </p>
                <p className="mt-1 font-mono text-xs">
                  <span className={admin ? "text-gold" : officer ? "text-primary" : "text-muted-foreground"}>
                    {admin ? "최고관리자" : officer ? "임원진" : "부원"}
                  </span>
                </p>
              </div>
              {admin ? (
                <span className="font-mono text-xs text-muted-foreground">ROLE LOCKED</span>
              ) : (
                <button
                  onClick={() => setOfficer.mutate({ id: m.id, make: !officer })}
                  className={`rounded-sm border px-3 py-1.5 text-xs transition-colors ${
                    officer
                      ? "border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                      : "border-primary/40 text-primary hover:bg-primary/10"
                  }`}
                >
                  {officer ? "임원진 해제" : "임원진 지정"}
                </button>
              )}
            </div>
          );
        })}
        {members.data?.length === 0 && (
          <p className="py-6 text-sm text-muted-foreground">인증된 부원이 없습니다.</p>
        )}
      </div>
    </section>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  mono,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  mono?: boolean;
  required?: boolean;
}) {
  return (
    <input
      value={value}
      required={required}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-sm border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/60 ${
        mono ? "font-mono" : ""
      }`}
    />
  );
}

function EditableCell({
  value,
  onSave,
  mono,
}: {
  value: string;
  onSave: (v: string) => void;
  mono?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <td className="py-2 pr-4">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) onSave(draft.trim());
        }}
        className={`w-full rounded-sm border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none transition-colors hover:border-border focus:border-primary/60 ${
          mono ? "font-mono text-xs" : ""
        }`}
      />
    </td>
  );
}
