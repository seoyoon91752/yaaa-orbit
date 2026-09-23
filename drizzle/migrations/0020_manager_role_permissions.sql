-- 관리자(manager) = 최고관리자(admin)와 동일한 권한, 단 admin 역할 부여/회수는 admin만 가능
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_officer(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager', 'officer')
  )
$$;

-- profiles
DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
CREATE POLICY "admins read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "admins update profiles" ON public.profiles;
CREATE POLICY "admins update profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "admins delete profiles" ON public.profiles;
CREATE POLICY "admins delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- roster
DROP POLICY IF EXISTS "admins manage roster" ON public.roster;
CREATE POLICY "admins manage roster" ON public.roster FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- user_roles
DROP POLICY IF EXISTS "admins read all roles" ON public.user_roles;
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    AND (role <> 'admin'::public.app_role OR public.has_role(auth.uid(), 'admin'))
  );
CREATE POLICY "admins update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    AND (role <> 'admin'::public.app_role OR public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    AND (role <> 'admin'::public.app_role OR public.has_role(auth.uid(), 'admin'))
  );
CREATE POLICY "admins delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.is_admin(auth.uid())
    AND (role <> 'admin'::public.app_role OR public.has_role(auth.uid(), 'admin'))
  );

-- posts / comments / signups
DROP POLICY IF EXISTS "authors delete own posts" ON public.posts;
CREATE POLICY "authors delete own posts" ON public.posts FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR (board = 'notice'::public.board_kind AND public.is_officer(auth.uid()))
    OR public.is_admin(auth.uid())
  );
DROP POLICY IF EXISTS "authors delete own comments" ON public.post_comments;
CREATE POLICY "authors delete own comments" ON public.post_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "host or admin update signups" ON public.activity_signups;
CREATE POLICY "host or admin update signups" ON public.activity_signups FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_signups.activity_id AND a.created_by = auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_signups.activity_id AND a.created_by = auth.uid())
  );

-- functions referencing admin
CREATE OR REPLACE FUNCTION public.guard_profile_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
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

CREATE OR REPLACE FUNCTION public.revoke_membership_on_roster_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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

  IF public.is_admin(_uid) THEN
    RETURN OLD;
  END IF;

  UPDATE public.profiles
     SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
   WHERE id = _uid;

  DELETE FROM public.user_roles WHERE user_id = _uid;

  RETURN OLD;
END;
$$;

-- 부원 프로필 명단에 역할 노출
DROP FUNCTION IF EXISTS public.list_members();
CREATE OR REPLACE FUNCTION public.list_members()
RETURNS TABLE(id uuid, full_name text, department text, cohort text, avatar_path text, roles text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, COALESCE(NULLIF(p.department, ''), r.department), r.cohort, p.avatar_path,
         COALESCE((SELECT array_agg(ur.role::text) FROM public.user_roles ur WHERE ur.user_id = p.id), '{}')
  FROM public.profiles p
  LEFT JOIN public.roster r
    ON norm_text(r.full_name) = norm_text(p.full_name)
   AND norm_text(r.student_id) = norm_text(p.student_id)
  WHERE p.status = 'verified'
    AND is_verified_member(auth.uid())
  ORDER BY p.full_name;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_members() TO authenticated;