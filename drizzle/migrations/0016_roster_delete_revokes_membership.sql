CREATE OR REPLACE FUNCTION public.revoke_membership_on_roster_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  SELECT p.id INTO _uid
  FROM public.profiles p
  WHERE public.norm_text(p.full_name) = public.norm_text(OLD.full_name)
    AND public.norm_text(p.student_id) = public.norm_text(OLD.student_id)
  LIMIT 1;

  IF _uid IS NULL THEN
    RETURN OLD;
  END IF;

  -- keep admins from locking themselves out
  IF public.has_role(_uid, 'admin') THEN
    RETURN OLD;
  END IF;

  UPDATE public.profiles
     SET status = 'rejected',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _uid;

  DELETE FROM public.user_roles WHERE user_id = _uid;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_revoke_membership_on_roster_delete ON public.roster;
CREATE TRIGGER trg_revoke_membership_on_roster_delete
AFTER DELETE ON public.roster
FOR EACH ROW EXECUTE FUNCTION public.revoke_membership_on_roster_delete();