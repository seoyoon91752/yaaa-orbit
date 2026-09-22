import { supabase } from "@/integrations/supabase/client";

/** Resolve signed URLs for a list of avatar storage paths. */
export async function signAvatars(paths: (string | null)[]) {
  const unique = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data } = await supabase.storage.from("avatars").createSignedUrls(unique, 60 * 60);
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
  }
  return map;
}

export function initialOf(name: string) {
  return name.trim().slice(0, 1) || "?";
}
