import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export function SiteHeader() {
  const { session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="group flex items-baseline gap-3">
          <span className="font-display text-lg font-bold tracking-[0.18em] text-foreground">
            YAAA
          </span>
          <span className="label-mono hidden sm:inline">Yonsei Astronomy</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {session ? (
            <>
              <Link
                to="/dashboard"
                className="rounded-sm px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                부원 홈
              </Link>
              <button
                onClick={signOut}
                className="rounded-sm border border-border px-3 py-2 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                로그아웃
              </button>
              <Link
                to="/dashboard"
                className="rounded-sm border border-primary/40 px-3 py-2 text-primary transition-colors hover:bg-primary/10"
              >
                부원 전용 공간 →
              </Link>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-sm border border-primary/40 px-4 py-2 text-primary transition-colors hover:bg-primary/10"
            >
              부원 로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
