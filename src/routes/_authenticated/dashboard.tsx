import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell, useMemberContext } from "@/components/member-shell";
import { useMembership, useSession } from "@/hooks/use-session";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "부원 홈 — YAAA 연세 아마추어 천문회" },
      { name: "description", content: "YAAA 부원 전용 홈. 다가오는 일정과 공지를 확인하세요." },
      { property: "og:title", content: "부원 홈 — YAAA" },
      { property: "og:description", content: "YAAA 부원 전용 공간." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { session } = useSession();
  const { data } = useMembership(Boolean(session));
  const queryClient = useQueryClient();

  const profile = data?.profile;

  async function bootstrapAdmin() {
    const { data: ok, error } = await supabase.rpc("claim_first_admin");
    if (error) {
      toast.error(error.message);
      return;
    }
    if (ok) {
      toast.success("관리자 권한이 부여되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["membership"] });
    } else {
      toast.error("이미 관리자가 존재합니다.");
    }
  }

  return (
    <MemberShell
      eyebrow="Member Console"
      title={profile?.full_name ? `${profile.full_name} 님, 환영합니다` : "부원 홈"}
    >
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        <Stat label="Status" value="명부 인증 완료" accent />
        <Stat label="Student ID" value={profile?.student_id ?? "—"} />
        <Stat label="Email" value={profile?.email ?? "—"} />
      </div>

      <UpcomingEvents />

      <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        <Shortcut to="/board/$board" params={{ board: "notice" }} label="공지사항" sub="Notices" />
        <Shortcut to="/board/$board" params={{ board: "free" }} label="자유게시판" sub="Community" />
        <Shortcut to="/me" label="마이페이지" sub="My Record" />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        {data?.isAdmin && (
          <Link
            to="/admin"
            className="rounded-sm border border-primary/40 px-4 py-2.5 text-sm text-primary transition-colors hover:bg-primary/10"
          >
            관리자 페이지 →
          </Link>
        )}
        {!data?.adminExists && (
          <button
            onClick={bootstrapAdmin}
            className="rounded-sm border border-gold/40 px-4 py-2.5 text-sm text-gold transition-colors hover:bg-gold/10"
          >
            최초 관리자로 등록
          </button>
        )}
      </div>
    </MemberShell>
  );
}

function UpcomingEvents() {
  const { profile } = useMemberContext();
  const { data } = useQuery({
    queryKey: ["upcoming-events"],
    enabled: profile?.status === "verified",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, category, location, starts_at")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between gap-6">
        <p className="label-mono">Upcoming</p>
        <Link
          to="/calendar"
          className="font-mono text-xs text-primary transition-opacity hover:opacity-80"
        >
          전체 일정 →
        </Link>
      </div>
      {(data?.length ?? 0) === 0 ? (
        <p className="mt-6 font-mono text-sm text-muted-foreground">예정된 일정이 없습니다.</p>
      ) : (
        <ul className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          {data!.map((e) => (
            <li key={e.id} className="bg-card px-6 py-6">
              <p className="label-mono text-gold">{e.category}</p>
              <p className="mt-3 truncate font-display text-lg font-semibold">{e.title}</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {formatDateTime(e.starts_at)}
              </p>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                {e.location ?? "장소 미정"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card px-6 py-6">
      <p className="label-mono">{label}</p>
      <p
        className={`mt-2 truncate font-mono text-sm ${accent ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Shortcut({
  to,
  params,
  label,
  sub,
}: {
  to: "/board/$board" | "/me" | "/calendar";
  params?: { board: string };
  label: string;
  sub: string;
}) {
  return (
    <Link
      to={to}
      params={params ?? {}}
      className="corner-marks bg-card px-6 py-7 transition-colors hover:bg-primary/5"
    >
      <p className="label-mono">{sub}</p>
      <p className="mt-3 font-display text-xl font-semibold">{label} →</p>
    </Link>
  );
}
