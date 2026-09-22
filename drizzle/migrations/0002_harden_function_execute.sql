ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION public.norm_text(text) SET search_path = public;
ALTER FUNCTION public.guard_profile_self_update() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.claim_membership() FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_post_view(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_verified_member(uuid) FROM anon;