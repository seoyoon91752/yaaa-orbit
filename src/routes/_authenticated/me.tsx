import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell, useMemberContext } from "@/components/member-shell";
import { formatDate, formatDateTime } from "@/lib/format";
import { initialOf, signAvatars } from "@/lib/avatars";

const RENTAL_LABEL: Record<string, string> = {
  pending: "대기중",
  approved: "승인됨",
  rejected: "거절됨",
  returned: "반납완료",
  cancelled: "취소됨",
};

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({
    meta: [
      { title: "마이페이지 — YAAA 연세 아마추어 천문회" },
      { name: "description", content: "YAAA 부원 개인 정보와 작성한 글 모아보기." },
      { property: "og:title", content: "마이페이지 — YAAA" },
      { property: "og:description", content: "YAAA 부원 개인 정보 관리." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyPage,
});

function MyPage() {
  const { userId } = useMemberContext();
  const queryClient = useQueryClient();
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const profile = useQuery({
    queryKey: ["my-profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile.data) {
      setDepartment(profile.data.department ?? "");
      setPhone(profile.data.phone ?? "");
    }
    const path = profile.data?.avatar_path;
    if (!path) {
      setAvatarUrl(null);
      return;
    }
    let alive = true;
    void signAvatars([path]).then((map) => {
      if (alive) setAvatarUrl(map.get(path) ?? null);
    });
    return () => {
      alive = false;
    };
  }, [profile.data]);

  const myPosts = useQuery({
    queryKey: ["my-posts", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, board, title, created_at, view_count")
        .eq("author_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const myRentals = useQuery({
    queryKey: ["my-rentals", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_rentals")
        .select("id, start_date, end_date, status, return_note, equipment(name)")
        .eq("user_id", userId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const myBookings = useQuery({
    queryKey: ["my-reservations", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_reservations")
        .select("id, starts_at, ends_at, purpose, headcount")
        .eq("user_id", userId!)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const myActivities = useQuery({
    queryKey: ["my-activities", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_signups")
        .select("id, attended, created_at, activities(id, title, category, starts_at)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const hostedActivities = useQuery({
    queryKey: ["my-hosted-activities", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id, title, category, location, starts_at")
        .eq("created_by", userId!)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const myPhotos = useQuery({
    queryKey: ["my-gallery", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("id, title, shot_at, created_at, storage_path")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [] as ((typeof rows)[number] & { url: string | null })[];
      const { data: signed } = await supabase.storage
        .from("gallery")
        .createSignedUrls(
          rows.map((r) => r.storage_path),
          60 * 60,
        );
      const map = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
      return rows.map((r) => ({ ...r, url: map.get(r.storage_path) ?? null }));
    },
  });

  const stardust = useQuery({
    queryKey: ["stardust", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stardust_balances")
        .select("balance")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? 0;
    },
  });

  const ledger = useQuery({
    queryKey: ["stardust-ledger", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stardust_ledger")
        .select("id, amount, reason, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const savePhone = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ department: department.trim() || null, phone: phone.trim() || null })
        .eq("id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("정보가 저장되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;
      const up = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (up.error) throw up.error;
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_path: path })
        .eq("id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("프로필 사진이 저장되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePw = useMutation({
    mutationFn: async () => {
      const email = profile.data?.email;
      if (!email) throw new Error("이메일 정보를 찾을 수 없습니다.");
      const check = await supabase.auth.signInWithPassword({ email, password: currentPw });
      if (check.error) throw new Error("현재 비밀번호가 올바르지 않습니다.");
      const { error } = await supabase.auth.updateUser({
        password: pw,
        current_password: currentPw,
      } as Parameters<typeof supabase.auth.updateUser>[0]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("비밀번호가 변경되었습니다.");
      setCurrentPw("");
      setPw("");
      setPw2("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const p = profile.data;

  return (
    <MemberShell eyebrow="My Record" title="마이페이지">
      <div className="max-w-2xl space-y-10">
        <section className="hairline rounded-lg bg-card/60 p-8">
          <p className="label-mono">Member Info</p>

          <div className="mt-6 flex items-center gap-5">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
              {avatarUrl ? (
                <img src={avatarUrl} alt={p?.full_name ?? ""} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-2xl text-muted-foreground">
                  {initialOf(p?.full_name ?? "?")}
                </span>
              )}
            </span>
            <label className="cursor-pointer rounded-sm border border-primary/40 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/10">
              {uploadAvatar.isPending ? "업로드 중…" : "프로필 사진 변경"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar.mutate(f);
                }}
              />
            </label>
          </div>

          <dl className="mt-8 space-y-5 font-mono text-sm">
            <Row k="NAME" v={p?.full_name ?? "—"} />
            <Row k="STUDENT ID" v={p?.student_id ?? "—"} />
            <Row k="EMAIL" v={p?.email ?? "—"} />
            <Row k="JOINED" v={p?.created_at ? formatDate(p.created_at) : "—"} />
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            이름과 학번은 부원 명부 기준 정보로 본인이 수정할 수 없습니다. 정정이 필요하면 운영진에게
            문의해 주세요.
          </p>

          <div className="mt-8 space-y-6 border-t border-border pt-6">
            <div>
              <p className="label-mono mb-2">학과</p>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="예) 천문우주학과"
                className="w-full rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                입력한 학과는 부원 프로필 명단에 표시됩니다.
              </p>
            </div>
            <div>
              <p className="label-mono mb-2">연락처</p>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <button
              onClick={() => savePhone.mutate()}
              disabled={savePhone.isPending}
              className="w-full rounded-sm border border-primary/40 px-5 py-2.5 text-sm text-primary transition-colors hover:bg-primary/10 disabled:opacity-50 sm:w-auto"
            >
              {savePhone.isPending ? "저장 중…" : "저장"}
            </button>
          </div>
        </section>

        <section className="hairline rounded-lg bg-card/60 p-8">
          <p className="label-mono">Password</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!currentPw) {
                toast.error("현재 비밀번호를 입력해 주세요.");
                return;
              }
              if (pw.length < 8) {
                toast.error("비밀번호는 8자 이상이어야 합니다.");
                return;
              }
              if (pw !== pw2) {
                toast.error("비밀번호가 일치하지 않습니다.");
                return;
              }
              changePw.mutate();
            }}
            className="mt-6 space-y-3"
          >
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="현재 비밀번호"
              autoComplete="current-password"
              className="w-full rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
            />
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="새 비밀번호 (8자 이상)"
              autoComplete="new-password"
              className="w-full rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
            />
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="새 비밀번호 확인"
              autoComplete="new-password"
              className="w-full rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
            />
            <button
              type="submit"
              disabled={changePw.isPending}
              className="rounded-sm border border-border px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
            >
              비밀번호 변경
            </button>
          </form>
        </section>
      </div>


      <section className="mt-16">
        <p className="label-mono">My Activities · {myActivities.data?.length ?? 0}</p>
        {(myActivities.data?.length ?? 0) === 0 ? (
          <p className="mt-6 font-mono text-sm text-muted-foreground">신청한 활동이 없습니다.</p>
        ) : (
          <ul className="mt-6 border-t border-border">
            {myActivities.data!.map((s) => (
              <li key={s.id} className="border-b border-border py-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="label-mono">{s.activities?.category ?? "—"}</span>
                  {s.activities ? (
                    <Link
                      to="/activities/$activityId"
                      params={{ activityId: s.activities.id }}
                      className="text-sm transition-colors hover:text-primary"
                    >
                      {s.activities.title}
                    </Link>
                  ) : (
                    <span className="text-sm">삭제된 활동</span>
                  )}
                  <span className="font-mono text-xs text-muted-foreground">
                    {s.activities ? formatDateTime(s.activities.starts_at) : "—"}
                  </span>
                  <span
                    className={`font-mono text-xs ${s.attended ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {s.attended ? "출석 확인됨" : "출석 미확인"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-16 grid gap-10 lg:grid-cols-2">
        <div>
          <p className="label-mono">My Rentals · {myRentals.data?.length ?? 0}</p>
          {(myRentals.data?.length ?? 0) === 0 ? (
            <p className="mt-6 font-mono text-sm text-muted-foreground">대여 내역이 없습니다.</p>
          ) : (
            <ul className="mt-6 border-t border-border">
              {myRentals.data!.map((r) => (
                <li key={r.id} className="border-b border-border py-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-mono text-xs text-primary">
                      {RENTAL_LABEL[r.status as keyof typeof RENTAL_LABEL]}
                    </span>
                    <span className="text-sm">{r.equipment?.name ?? "—"}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatDate(r.start_date)} → {formatDate(r.end_date)}
                    </span>
                  </div>
                  {r.return_note && (
                    <p className="mt-1 font-mono text-xs text-gold">특이사항: {r.return_note}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="label-mono">My Bookings · {myBookings.data?.length ?? 0}</p>
          {(myBookings.data?.length ?? 0) === 0 ? (
            <p className="mt-6 font-mono text-sm text-muted-foreground">예약 내역이 없습니다.</p>
          ) : (
            <ul className="mt-6 border-t border-border">
              {myBookings.data!.map((b) => (
                <li key={b.id} className="border-b border-border py-4">
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatDateTime(b.starts_at)} – {new Date(b.ends_at).toTimeString().slice(0, 5)}
                  </p>
                  <p className="mt-1 text-sm">
                    {b.purpose} · {b.headcount}명
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-16">
        <p className="label-mono">My Hosted Activities · {hostedActivities.data?.length ?? 0}</p>
        {(hostedActivities.data?.length ?? 0) === 0 ? (
          <p className="mt-6 font-mono text-sm text-muted-foreground">개설한 활동이 없습니다.</p>
        ) : (
          <ul className="mt-6 border-t border-border">
            {hostedActivities.data!.map((a) => (
              <li key={a.id} className="border-b border-border">
                <Link
                  to="/activities/$activityId"
                  params={{ activityId: a.id }}
                  className="flex flex-wrap items-center gap-x-5 gap-y-1 py-4 transition-colors hover:text-primary"
                >
                  <span className="label-mono">{a.category}</span>
                  <span className="text-sm">{a.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDateTime(a.starts_at)}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {a.location ?? "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="label-mono mt-16">My Gallery · {myPhotos.data?.length ?? 0}</p>
      <section className="hairline mt-4 rounded-lg bg-card/60 p-8">
        {(myPhotos.data?.length ?? 0) === 0 ? (
          <p className="mt-6 font-mono text-sm text-muted-foreground">올린 사진이 없습니다.</p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {myPhotos.data!.map((ph) => (
              <article
                key={ph.id}
                className="overflow-hidden rounded-lg border border-border bg-card/60"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-background">
                  {ph.url ? (
                    <img
                      src={ph.url}
                      alt={ph.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="font-display text-base font-semibold">{ph.title}</h3>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {ph.shot_at ?? formatDate(ph.created_at)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-16">
        <p className="label-mono">My Posts · {myPosts.data?.length ?? 0}</p>
        {(myPosts.data?.length ?? 0) === 0 ? (
          <p className="mt-6 font-mono text-sm text-muted-foreground">작성한 글이 없습니다.</p>
        ) : (
          <ul className="mt-6 border-t border-border">
            {myPosts.data!.map((post) => (
              <li key={post.id} className="border-b border-border">
                <Link
                  to="/board/$board/$postId"
                  params={{ board: post.board, postId: post.id }}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 py-5 transition-colors hover:text-primary"
                >
                  <span className="label-mono">
                    {post.board === "notice" ? "NOTICE" : "FREE"}
                  </span>
                  <span className="truncate text-base">{post.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDate(post.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-16">
        <p className="label-mono">Stardust</p>
        <div className="mt-6 flex flex-wrap items-baseline gap-4">
          <span className="font-mono text-4xl font-semibold text-gold">
            {stardust.data ?? 0}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            보유 별가루 · 활동 출석 시 지급됩니다
          </span>
        </div>
        {(ledger.data?.length ?? 0) === 0 ? (
          <p className="mt-6 font-mono text-sm text-muted-foreground">내역이 없습니다.</p>
        ) : (
          <ul className="mt-6 border-t border-border">
            {ledger.data!.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-4 border-b border-border py-3.5"
              >
                <span className="truncate text-sm">{l.reason}</span>
                <span className="flex shrink-0 items-center gap-4 font-mono text-xs">
                  <span className={l.amount > 0 ? "text-gold" : "text-muted-foreground"}>
                    {l.amount > 0 ? `+${l.amount}` : l.amount}
                  </span>
                  <span className="text-muted-foreground">{formatDateTime(l.created_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
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
