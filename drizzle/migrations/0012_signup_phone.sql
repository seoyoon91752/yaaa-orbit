CREATE OR REPLACE FUNCTION public.claim_membership()
 RETURNS public.profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_meta jsonb;
  v_email text;
  v_name text;
  v_sid text;
  v_phone text;
  v_match boolean;
  v_profile public.profiles;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT raw_user_meta_data, email INTO v_meta, v_email
  FROM auth.users WHERE id = v_uid;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF FOUND THEN
    RETURN v_profile;
  END IF;

  v_name := coalesce(v_meta->>'full_name', '');
  v_sid  := coalesce(v_meta->>'student_id', '');
  v_phone := nullif(btrim(coalesce(v_meta->>'phone', '')), '');

  SELECT EXISTS (
    SELECT 1 FROM public.roster r
    WHERE public.norm_text(r.full_name) = public.norm_text(v_name)
      AND public.norm_text(r.student_id) = public.norm_text(v_sid)
  ) INTO v_match;

  INSERT INTO public.profiles (id, full_name, student_id, email, phone, status)
  VALUES (v_uid, v_name, v_sid, v_email, v_phone,
    CASE WHEN v_match THEN 'verified'::public.member_status ELSE 'pending'::public.member_status END)
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$function$;