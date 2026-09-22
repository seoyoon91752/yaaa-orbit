import { createFileRoute, Link } from "@tanstack/react-router";
import { useMembership, useSession } from "@/hooks/use-session";
import { SiteHeader } from "@/components/site-header";
import { StarField } from "@/components/star-field";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "부원 홈 — YAAA 연세 아마추어 천문회" },
      { name: "description", content: "YAAA 부원 전용 홈. 인증 상태와 공지를 확인하세요." },
      { property: "og:title", content: "부원 홈 — YAAA" },
      { property: "og:description", content: "YAAA 부원 전용 공간." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { session } = useSession();
  const { data, isLoading } = useMembership(Boolean(session));
  const queryClient = useQueryClient();

  const profile = data?.profile;
  const status = profile?.status ?? "pending";

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
    <div className="relative min-h-screen">
      <StarField className="opacity-40" />
      <div className="relative z-10">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-6 py-16">
          <p className="label-mono">Member Console</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            {profile?.full_name ? `${profile.full_name} 님, 환영합니다` : "부원 홈"}
          </h1>

          {isLoading ? (
            <p className="mt-8 font-mono text-sm text-muted-foreground">LOADING…</p>
          ) : (
            <>
              <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
                <Stat label="Status" value={statusLabel(status)} accent={status === "verified"} />
                <Stat label="Student ID" value={profile?.student_id ?? "—"} />
                <Stat label="Email" value={profile?.email ?? "—"} />
              </div>

              {status !== "verified" && (
                <div className="mt-8 hairline rounded-lg border-gold/40 bg-gold/5 p-6">
                  <p className="font-display text-lg font-semibold text-gold">
                    {status === "pending" ? "관리자 승인 대기 중" : "가입이 거절되었습니다"}
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {status === "pending"
                      ? "입력하신 이름·학번이 부원 명부와 일치하지 않아 자동 인증되지 않았습니다. 운영진이 확인 후 수동으로 승인합니다. 승인 전에는 부원 전용 자료를 열람할 수 없습니다."
                      : "운영진이 가입 신청을 거절했습니다. 문의는 동아리 운영진에게 연락해 주세요."}
                  </p>
                </div>
              )}

              {status === "verified" && (
                <div className="mt-8 hairline rounded-lg bg-card/60 p-8">
                  <p className="label-mono">Notice</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    인증이 완료되었습니다. 게시판 · 관측 캘린더 · 마이페이지는 2단계에서
                    추가됩니다.
                  </p>
                </div>
              )}

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
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "verified") return "명부 인증 완료";
  if (status === "rejected") return "거절됨";
  return "승인 대기";
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
