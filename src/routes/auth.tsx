import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { StarField } from "@/components/star-field";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "부원 인증 — YAAA 연세 아마추어 천문회" },
      {
        name: "description",
        content: "YAAA 부원 명부에 등록된 회원만 가입 및 로그인할 수 있는 인증 페이지입니다.",
      },
      { property: "og:title", content: "부원 인증 — YAAA 연세 아마추어 천문회" },
      {
        property: "og:description",
        content: "YAAA 부원 전용 로그인 및 명부 기반 회원가입.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const { session } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    if (mode === "signup") {
      // Bot protection: hidden field + minimum fill time + human check question.
      if (honeypot.trim() !== "") return;
      if (Date.now() - openedAt < 3000) {
        toast.error("잠시 후 다시 시도해 주세요.");
        return;
      }
      if (answer.replace(/\s/g, "") !== "8") {
        toast.error("스팸 방지 질문의 답이 올바르지 않습니다.");
        return;
      }
      if (!fullName.trim() || !studentId.trim()) {
        toast.error("이름과 학번을 모두 입력해 주세요.");
        return;
      }
      if (!phone.trim()) {
        toast.error("연락처를 입력해 주세요.");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName.trim(), student_id: studentId.trim() },
          },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <StarField className="opacity-70" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          <Link to="/" className="label-mono transition-colors hover:text-foreground">
            ← 메인으로
          </Link>

          <div className="mt-6 hairline rounded-lg bg-card/70 p-8 backdrop-blur-sm">
            <p className="label-mono">Member Access</p>
            <h1 className="mt-3 text-2xl font-semibold">
              {mode === "signin" ? "부원 로그인" : "부원 가입 신청"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {mode === "signin"
                ? "등록된 부원 계정으로 로그인하세요."
                : "동아리 명부에 등록된 이름·학번과 일치해야 자동 승인됩니다. 일치하지 않으면 관리자 승인 대기 상태로 접수됩니다."}
            </p>

            {sent ? (
              <div className="mt-8 hairline rounded-md border-primary/40 bg-primary/5 p-5 text-sm leading-relaxed">
                <p className="font-medium text-primary">이메일 인증 메일을 보냈습니다.</p>
                <p className="mt-2 text-muted-foreground">
                  {email} 주소의 인증 링크를 눌러야 가입이 완료됩니다. 인증 후 로그인하면 명부 대조
                  결과가 표시됩니다.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {mode === "signup" && (
                  <>
                    <Field
                      label="이름"
                      value={fullName}
                      onChange={setFullName}
                      placeholder="홍길동"
                      autoComplete="name"
                    />
                    <Field
                      label="학번"
                      value={studentId}
                      onChange={setStudentId}
                      placeholder="2023123456"
                      mono
                      autoComplete="off"
                    />
                  </>
                )}
                <Field
                  label="이메일"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@yonsei.ac.kr"
                  autoComplete="email"
                  mono
                />
                <Field
                  label="비밀번호"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="********"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />

                {mode === "signup" && (
                  <>
                    <Field
                      label="스팸 방지 — 5 + 3 = ?"
                      value={answer}
                      onChange={setAnswer}
                      placeholder="숫자로 입력"
                      mono
                      autoComplete="off"
                    />
                    <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0">
                      <label htmlFor="website-field">Website</label>
                      <input
                        id="website-field"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 w-full rounded-sm bg-primary px-4 py-3 text-sm font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "처리 중…" : mode === "signin" ? "로그인" : "가입 신청"}
                </button>
              </form>
            )}

            {!sent && (
              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="mt-6 w-full text-center text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                {mode === "signin"
                  ? "아직 계정이 없나요? 부원 가입 신청"
                  : "이미 계정이 있나요? 로그인"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  mono,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  mono?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="label-mono">{label}</span>
      <input
        type={type}
        value={value}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-2 w-full rounded-sm border border-input bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/60 ${
          mono ? "font-mono" : ""
        }`}
      />
    </label>
  );
}
