import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export type MemberProfile = {
  id: string;
  full_name: string;
  student_id: string;
  email: string | null;
  status: "verified" | "pending" | "rejected";
  created_at: string;
};

/** Ensures the caller has a profile row (roster-matched) and reports admin rights. */
export function useMembership(enabled: boolean) {
  return useQuery({
    queryKey: ["membership"],
    enabled,
    queryFn: async () => {
      const { data: claimed, error } = await supabase.rpc("claim_membership");
      if (error) throw error;
      const profile = (Array.isArray(claimed) ? claimed[0] : claimed) as MemberProfile | null;

      const { data: roles } = await supabase.from("user_roles").select("role");
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      const isOfficer = isAdmin || (roles ?? []).some((r) => r.role === "officer");

      const { data: anyAdmin } = await supabase.rpc("admin_exists");

      return { profile, isAdmin, isOfficer, adminExists: Boolean(anyAdmin) };
    },
  });
}
