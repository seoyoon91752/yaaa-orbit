import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { password: string }) => {
    if (!data || typeof data.password !== "string" || data.password.length === 0) {
      throw new Error("비밀번호를 입력해 주세요.");
    }
    return { password: data.password };
  })
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createClient } = await import("@supabase/supabase-js");

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userErr || !userRes?.user?.email) {
      throw new Error("계정 정보를 찾을 수 없습니다.");
    }
    const email = userRes.user.email;

    const SUPABASE_URL = process.env["SUPABASE_URL"]!;
    const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const anon = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
          headers.delete("Authorization");
          return fetch(input, { ...init, headers });
        },
      },
    });

    const check = await anon.auth.signInWithPassword({ email, password: data.password });
    if (check.error) {
      return { ok: false as const, reason: "password" as const };
    }
    await anon.auth.signOut();

    // Remove stored files owned by the user.
    for (const bucket of ["gallery", "avatars"]) {
      const { data: files } = await supabaseAdmin.storage.from(bucket).list(userId, { limit: 1000 });
      const paths = (files ?? []).map((f) => `${userId}/${f.name}`);
      if (paths.length > 0) await supabaseAdmin.storage.from(bucket).remove(paths);
    }

    const byUser: string[] = [
      "quest_claims",
      "user_celestial_objects",
      "stardust_ledger",
      "stardust_balances",
      "room_reservations",
      "equipment_rentals",
      "activity_signups",
      "gallery_photos",
      "user_roles",
    ];
    for (const table of byUser) {
      await supabaseAdmin
        .from(table as "user_roles")
        .delete()
        .eq("user_id", userId);
    }
    await supabaseAdmin.from("post_comments").delete().eq("author_id", userId);
    await supabaseAdmin.from("posts").delete().eq("author_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) throw new Error("탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");

    return { ok: true as const };
  });
