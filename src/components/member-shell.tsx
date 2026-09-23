import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { StarField } from "@/components/star-field";
import { useMembership, useSession } from "@/hooks/use-session";

const NAV = [
  { to: "/dashboard", label: "부원 홈", match: "/dashboard" },
  { to: "/board/$board", params: { board: "notice" }, label: "공지사항", match: "/board/notice" },
  { to: "/board/$board", params: { board: "free" }, label: "자유게시판", match: "/board/free" },
  { to: "/calendar", label: "일정", match: "/calendar" },
  { to: "/activities", label: "활동", match: "/activities" },
  { to: "/gallery", label: "갤러리", match: "/gallery" },
  { to: "/members", label: "부원 프로필", match: "/members" },
  { to: "/equipment", label: "장비 대여", match: "/equipment" },
  { to: "/room", label: "동아리방 예약", match: "/room" },
  { to: "/sky", label: "천체 정보", match: "/sky" },
  { to: "/universe", label: "나의 우주", match: "/universe" },
  { to: "/me", label: "마이페이지", match: "/me" },
] as const;

/** Shared chrome for member-only pages; blocks unverified members. */
export function MemberShell({
  eyebrow,
  title,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { session } = useSession();
  const { data, isLoading } = useMembership(Boolean(session));
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const status = data?.profile?.status ?? "pending";


  return (
    <div className="relative min-h-screen">
      <StarField className="opacity-40" />
      <div className="relative z-10">
        <SiteHeader />

        <div className="border-b border-border/70">
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 py-2 text-sm">
            {NAV.map((item) => {
              const active = pathname === item.match || pathname.startsWith(`${item.match}/`);
              return (
                <Link
                  key={item.match}
                  to={item.to}
                  params={"params" in item ? item.params : {}}
                  className={`shrink-0 rounded-sm px-3 py-2 transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <main className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
            <div className="min-w-0">
              <p className="label-mono">{eyebrow}</p>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{title}</h1>
            </div>
            {actions}
          </div>

          {isLoading ? (
            <p className="mt-12 font-mono text-sm text-muted-foreground">LOADING…</p>
          ) : status !== "verified" ? (
            <div className="hairline mt-12 rounded-lg border-gold/40 bg-gold/5 p-8">
              <p className="font-display text-lg font-semibold text-gold">명부 인증이 필요합니다</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {status === "rejected"
                  ? "가입 신청이 반려되었습니다. 이름·학번을 확인한 뒤 다시 회원가입해 주세요."
                  : "명부 인증이 완료된 부원만 게시판 · 일정 · 마이페이지를 이용할 수 있습니다. 운영진 승인 후 다시 확인해 주세요."}
              </p>
            </div>
          ) : (
            <div className="mt-12">{children}</div>
          )}
        </main>
      </div>
    </div>
  );
}

export function useMemberContext() {
  const { session } = useSession();
  const { data } = useMembership(Boolean(session));
  return {
    userId: session?.user.id ?? null,
    profile: data?.profile ?? null,
    isAdmin: Boolean(data?.isAdmin),
    isOfficer: Boolean(data?.isOfficer),
  };
}
