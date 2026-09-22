ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text;

CREATE OR REPLACE FUNCTION public.list_members()
 RETURNS TABLE(id uuid, full_name text, department text, cohort text, avatar_path text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name, COALESCE(NULLIF(p.department, ''), r.department), r.cohort, p.avatar_path
  FROM public.profiles p
  LEFT JOIN public.roster r
    ON norm_text(r.full_name) = norm_text(p.full_name)
   AND norm_text(r.student_id) = norm_text(p.student_id)
  WHERE p.status = 'verified'
    AND is_verified_member(auth.uid())
  ORDER BY p.full_name;
$function$;