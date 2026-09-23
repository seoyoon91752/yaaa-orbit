DROP FUNCTION IF EXISTS public.reapply_membership();

CREATE OR REPLACE FUNCTION public.claim_membership()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  v_name := coalesce(v_meta->>'full_name', '');
  v_sid  := coalesce(v_meta->>'student_id', '');
  v_phone := nullif(btrim(coalesce(v_meta->>'phone', '')), '');

  SELECT EXISTS (
    SELECT 1 FROM public.roster r
    WHERE public.norm_text(r.full_name) = public.norm_text(v_name)
      AND public.norm_text(r.student_id) = public.norm_text(v_sid)
  ) INTO v_match;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF FOUND THEN
    -- A fresh sign-up attempt re-opens a previously rejected application.
    IF v_profile.status = 'rejected' THEN
      PERFORM set_config('app.membership_reapply', 'on', true);
      UPDATE public.profiles
      SET full_name = coalesce(nullif(v_name, ''), full_name),
          student_id = coalesce(nullif(v_sid, ''), student_id),
          phone = coalesce(v_phone, phone),
          status = CASE WHEN v_match THEN 'verified'::public.member_status
                        ELSE 'pending'::public.member_status END,
          reviewed_by = NULL,
          reviewed_at = NULL
      WHERE id = v_uid
      RETURNING * INTO v_profile;
      PERFORM set_config('app.membership_reapply', 'off', true);
    END IF;
    RETURN v_profile;
  END IF;

  INSERT INTO public.profiles (id, full_name, student_id, email, phone, status)
  VALUES (v_uid, v_name, v_sid, v_email, v_phone,
    CASE WHEN v_match THEN 'verified'::public.member_status ELSE 'pending'::public.member_status END)
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;