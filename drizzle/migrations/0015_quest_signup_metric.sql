ALTER TABLE public.quests DROP CONSTRAINT IF EXISTS quests_metric_check;
ALTER TABLE public.quests ADD CONSTRAINT quests_metric_check
  CHECK (metric IN ('attendance','collection','gallery','writing','signup'));

CREATE OR REPLACE FUNCTION public.quest_metric_progress(_user_id uuid, _metric text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer := 0;
BEGIN
  IF _metric = 'attendance' THEN
    SELECT count(*) INTO n FROM public.activity_signups s WHERE s.user_id = _user_id AND s.attended;
  ELSIF _metric = 'collection' THEN
    SELECT count(*) INTO n FROM public.user_celestial_objects u WHERE u.user_id = _user_id;
  ELSIF _metric = 'gallery' THEN
    SELECT count(*) INTO n FROM public.gallery_photos g WHERE g.user_id = _user_id;
  ELSIF _metric = 'writing' THEN
    SELECT (SELECT count(*) FROM public.posts p WHERE p.author_id = _user_id)
         + (SELECT count(*) FROM public.post_comments c WHERE c.author_id = _user_id)
      INTO n;
  ELSIF _metric = 'signup' THEN
    SELECT count(*) INTO n FROM public.profiles pr
      WHERE pr.id = _user_id AND pr.status = 'verified';
  END IF;
  RETURN COALESCE(n, 0);
END;
$$;

INSERT INTO public.quests (title, description, metric, goal, reward, active, sort_order)
SELECT '첫 걸음', '부원 인증을 마치고 YAAA에 합류했습니다.', 'signup', 1, 5, true, -1
WHERE NOT EXISTS (SELECT 1 FROM public.quests WHERE metric = 'signup');