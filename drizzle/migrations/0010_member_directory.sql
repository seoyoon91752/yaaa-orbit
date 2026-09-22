ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path text;

CREATE POLICY "verified members read avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND is_verified_member(auth.uid()));

CREATE POLICY "own avatar upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND is_verified_member(auth.uid())
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "own avatar update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "own avatar delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- member directory: name / department / photo only, no contact info
CREATE OR REPLACE FUNCTION public.list_members()
RETURNS TABLE(id uuid, full_name text, department text, cohort text, avatar_path text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, r.department, r.cohort, p.avatar_path
  FROM public.profiles p
  LEFT JOIN public.roster r
    ON norm_text(r.full_name) = norm_text(p.full_name)
   AND norm_text(r.student_id) = norm_text(p.student_id)
  WHERE p.status = 'verified'
    AND is_verified_member(auth.uid())
  ORDER BY p.full_name;
$$;

REVOKE ALL ON FUNCTION public.list_members() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_members() TO authenticated;