CREATE OR REPLACE FUNCTION public.guard_profile_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('app.membership_reapply', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.full_name IS DISTINCT FROM OLD.full_name
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
    RAISE EXCEPTION '이름·학번·승인 상태는 본인이 수정할 수 없습니다. 운영진에게 문의해 주세요.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reapply_membership()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_match boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION '프로필을 찾을 수 없습니다.';
  END IF;

  IF v_profile.status <> 'rejected' THEN
    RETURN v_profile;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.roster r
    WHERE public.norm_text(r.full_name) = public.norm_text(v_profile.full_name)
      AND public.norm_text(r.student_id) = public.norm_text(v_profile.student_id)
  ) INTO v_match;

  PERFORM set_config('app.membership_reapply', 'on', true);

  UPDATE public.profiles
  SET status = CASE WHEN v_match THEN 'verified'::public.member_status
                    ELSE 'pending'::public.member_status END,
      reviewed_by = NULL,
      reviewed_at = NULL
  WHERE id = v_uid
  RETURNING * INTO v_profile;

  PERFORM set_config('app.membership_reapply', 'off', true);

  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.reapply_membership() FROM public;
GRANT EXECUTE ON FUNCTION public.reapply_membership() TO authenticated;