-- Officer-or-admin check, verified server-side. Frontend cannot forge roles.
CREATE OR REPLACE FUNCTION public.is_officer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'officer')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_officer(uuid) FROM anon;

-- POSTS: notices writable by officers and admins; free board by any verified member.
DROP POLICY IF EXISTS "members write free posts" ON public.posts;
CREATE POLICY "members write posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_verified_member(auth.uid())
    AND (board = 'free' OR public.is_officer(auth.uid()))
  );

DROP POLICY IF EXISTS "authors update own posts" ON public.posts;
CREATE POLICY "authors update own posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    OR (board = 'notice' AND public.is_officer(auth.uid()))
  )
  WITH CHECK (
    author_id = auth.uid()
    OR (board = 'notice' AND public.is_officer(auth.uid()))
  );

-- Deleting other members' posts: notices -> officers; free board -> admins only.
DROP POLICY IF EXISTS "authors delete own posts" ON public.posts;
CREATE POLICY "authors delete own posts" ON public.posts
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR (board = 'notice' AND public.is_officer(auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );

-- Comments: authors edit own; forced removal stays admin-only.
DROP POLICY IF EXISTS "authors delete own comments" ON public.post_comments;
CREATE POLICY "authors delete own comments" ON public.post_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- EVENTS: officers and admins manage; verified members read.
DROP POLICY IF EXISTS "admins manage events" ON public.events;
CREATE POLICY "officers manage events" ON public.events
  FOR ALL TO authenticated
  USING (public.is_officer(auth.uid()))
  WITH CHECK (public.is_officer(auth.uid()));