-- 기존 자동 지급 제거 (출석 / 갤러리)
DROP TRIGGER IF EXISTS award_attendance_stardust ON public.activity_signups;
DROP TRIGGER IF EXISTS trg_award_attendance_stardust ON public.activity_signups;
DROP TRIGGER IF EXISTS award_gallery_stardust ON public.gallery_photos;
DROP TRIGGER IF EXISTS trg_award_gallery_stardust ON public.gallery_photos;

CREATE TABLE IF NOT EXISTS public.quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  metric text NOT NULL CHECK (metric IN ('attendance','collection','gallery','writing')),
  goal integer NOT NULL CHECK (goal > 0),
  reward integer NOT NULL DEFAULT 1 CHECK (reward > 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quests TO authenticated;
GRANT ALL ON public.quests TO service_role;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verified members read quests" ON public.quests
FOR SELECT TO authenticated USING (is_verified_member(auth.uid()));

CREATE POLICY "officers manage quests" ON public.quests
FOR ALL TO authenticated USING (is_officer(auth.uid())) WITH CHECK (is_officer(auth.uid()));

CREATE TABLE IF NOT EXISTS public.quest_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quest_id, user_id)
);

GRANT SELECT ON public.quest_claims TO authenticated;
GRANT ALL ON public.quest_claims TO service_role;
ALTER TABLE public.quest_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own or officer read claims" ON public.quest_claims
FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_officer(auth.uid()));

CREATE TRIGGER touch_quests BEFORE UPDATE ON public.quests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 진행도 계산
CREATE OR REPLACE FUNCTION public.quest_metric_progress(_user_id uuid, _metric text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _metric
    WHEN 'attendance' THEN (SELECT count(*) FROM activity_signups WHERE user_id = _user_id AND attended)
    WHEN 'collection' THEN (SELECT count(*) FROM user_celestial_objects WHERE user_id = _user_id)
    WHEN 'gallery' THEN (SELECT count(*) FROM gallery_photos WHERE user_id = _user_id)
    WHEN 'writing' THEN (SELECT count(*) FROM posts WHERE author_id = _user_id)
                      + (SELECT count(*) FROM post_comments WHERE author_id = _user_id)
    ELSE 0
  END::integer
$$;

CREATE OR REPLACE FUNCTION public.my_quests()
RETURNS TABLE (
  id uuid, title text, description text, metric text,
  goal integer, reward integer, progress integer, claimed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.title, q.description, q.metric, q.goal, q.reward,
         quest_metric_progress(auth.uid(), q.metric) AS progress,
         EXISTS (SELECT 1 FROM quest_claims c WHERE c.quest_id = q.id AND c.user_id = auth.uid()) AS claimed
  FROM quests q
  WHERE q.active AND is_verified_member(auth.uid())
  ORDER BY q.sort_order, q.created_at
$$;

CREATE OR REPLACE FUNCTION public.claim_quest(_quest_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _q quests%ROWTYPE;
  _progress integer;
  _balance integer;
BEGIN
  IF NOT is_verified_member(_uid) THEN
    RAISE EXCEPTION '명부 인증된 부원만 사용할 수 있습니다.';
  END IF;

  SELECT * INTO _q FROM quests WHERE id = _quest_id AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION '퀘스트를 찾을 수 없습니다.';
  END IF;

  IF EXISTS (SELECT 1 FROM quest_claims WHERE quest_id = _quest_id AND user_id = _uid) THEN
    RAISE EXCEPTION '이미 보상을 받은 퀘스트입니다.';
  END IF;

  _progress := quest_metric_progress(_uid, _q.metric);
  IF _progress < _q.goal THEN
    RAISE EXCEPTION '아직 달성하지 못한 퀘스트입니다.';
  END IF;

  INSERT INTO quest_claims (quest_id, user_id, amount) VALUES (_quest_id, _uid, _q.reward);

  INSERT INTO stardust_balances (user_id, balance)
  VALUES (_uid, _q.reward)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = stardust_balances.balance + EXCLUDED.balance, updated_at = now()
  RETURNING balance INTO _balance;

  INSERT INTO stardust_ledger (user_id, amount, reason)
  VALUES (_uid, _q.reward, '퀘스트 달성 · ' || _q.title);

  RETURN _balance;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_quest(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_quest(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_quests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.quest_metric_progress(uuid, text) TO authenticated;

INSERT INTO public.quests (title, description, metric, goal, reward, sort_order) VALUES
  ('첫 관측 출석', '활동에 참여해 출석을 1회 인정받으세요.', 'attendance', 1, 3, 10),
  ('성실한 관측자', '활동 출석 5회를 달성하세요.', 'attendance', 5, 10, 20),
  ('첫 프레임', '갤러리에 천체 사진을 1장 올리세요.', 'gallery', 1, 2, 30),
  ('아카이브 기여', '갤러리에 사진 5장을 올리세요.', 'gallery', 5, 8, 40),
  ('기록하는 사람', '게시글과 댓글을 합쳐 5개 작성하세요.', 'writing', 5, 3, 50),
  ('나만의 성도', '천체를 5개 수집하세요.', 'collection', 5, 5, 60),
  ('수집가', '천체를 20개 수집하세요.', 'collection', 20, 15, 70);
