-- profiles: contact field editable by owner
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

CREATE OR REPLACE FUNCTION public.is_verified_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND status = 'verified'
  )
$$;

-- owner may update only mutable fields
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

DROP TRIGGER IF EXISTS guard_profile_self_update ON public.profiles;
CREATE TRIGGER guard_profile_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_self_update();

DROP POLICY IF EXISTS "update own profile" ON public.profiles;
CREATE POLICY "update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- boards
DO $$ BEGIN
  CREATE TYPE public.board_kind AS ENUM ('notice', 'free');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board public.board_kind NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verified members read posts" ON public.posts
FOR SELECT TO authenticated
USING (public.is_verified_member(auth.uid()));

CREATE POLICY "members write free posts" ON public.posts
FOR INSERT TO authenticated
WITH CHECK (
  public.is_verified_member(auth.uid())
  AND author_id = auth.uid()
  AND (board = 'free' OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "authors update own posts" ON public.posts
FOR UPDATE TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authors delete own posts" ON public.posts
FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS posts_board_created_idx ON public.posts (board, created_at DESC);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verified members read comments" ON public.post_comments
FOR SELECT TO authenticated
USING (public.is_verified_member(auth.uid()));

CREATE POLICY "members write comments" ON public.post_comments
FOR INSERT TO authenticated
WITH CHECK (public.is_verified_member(auth.uid()) AND author_id = auth.uid());

CREATE POLICY "authors update own comments" ON public.post_comments
FOR UPDATE TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "authors delete own comments" ON public.post_comments
FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS post_comments_post_idx ON public.post_comments (post_id, created_at);

-- events
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT '관측회',
  description text,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verified members read events" ON public.events
FOR SELECT TO authenticated
USING (public.is_verified_member(auth.uid()));

CREATE POLICY "admins manage events" ON public.events
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS events_starts_idx ON public.events (starts_at);

-- triggers for updated_at
DROP TRIGGER IF EXISTS touch_posts ON public.posts;
CREATE TRIGGER touch_posts BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_comments ON public.post_comments;
CREATE TRIGGER touch_comments BEFORE UPDATE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_events ON public.events;
CREATE TRIGGER touch_events BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- view counter (bypasses the author-only update policy)
CREATE OR REPLACE FUNCTION public.increment_post_view(_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_verified_member(auth.uid()) THEN
    RETURN;
  END IF;
  UPDATE public.posts SET view_count = view_count + 1 WHERE id = _post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_post_view(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_post_view(uuid) TO authenticated;