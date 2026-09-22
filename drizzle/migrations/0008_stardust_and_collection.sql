-- 활동별 출석 보상
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS stardust_reward integer NOT NULL DEFAULT 1;

-- 별가루 잔액
CREATE TABLE IF NOT EXISTS public.stardust_balances (
  user_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stardust_balances TO authenticated;
GRANT ALL ON public.stardust_balances TO service_role;
ALTER TABLE public.stardust_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or officer read balance" ON public.stardust_balances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_officer(auth.uid()));

-- 별가루 지급/사용 내역
CREATE TABLE IF NOT EXISTS public.stardust_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stardust_ledger_user_idx ON public.stardust_ledger (user_id, created_at DESC);
GRANT SELECT ON public.stardust_ledger TO authenticated;
GRANT ALL ON public.stardust_ledger TO service_role;
ALTER TABLE public.stardust_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or officer read ledger" ON public.stardust_ledger
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_officer(auth.uid()));

-- 보유 천체
CREATE TABLE IF NOT EXISTS public.user_celestial_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  object_id uuid NOT NULL REFERENCES public.celestial_objects(id) ON DELETE CASCADE,
  rarity text NOT NULL DEFAULT 'common',
  obtained_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, object_id)
);
GRANT SELECT ON public.user_celestial_objects TO authenticated;
GRANT ALL ON public.user_celestial_objects TO service_role;
ALTER TABLE public.user_celestial_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or officer read collection" ON public.user_celestial_objects
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_officer(auth.uid()));

-- 별가루 지급 (임원진 이상만)
CREATE OR REPLACE FUNCTION public.grant_stardust(
  _user_id uuid,
  _amount integer,
  _reason text,
  _activity_id uuid DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new integer;
BEGIN
  IF NOT public.is_officer(auth.uid()) THEN
    RAISE EXCEPTION '별가루 지급 권한이 없습니다.';
  END IF;
  IF _amount IS NULL OR _amount = 0 THEN
    RAISE EXCEPTION '지급 개수를 확인해 주세요.';
  END IF;

  INSERT INTO public.stardust_balances (user_id, balance)
  VALUES (_user_id, GREATEST(_amount, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET balance = GREATEST(public.stardust_balances.balance + _amount, 0),
        updated_at = now()
  RETURNING balance INTO _new;

  INSERT INTO public.stardust_ledger (user_id, amount, reason, activity_id)
  VALUES (_user_id, _amount, _reason, _activity_id);

  RETURN _new;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.grant_stardust(uuid, integer, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.grant_stardust(uuid, integer, text, uuid) TO authenticated;

-- 출석 체크 시 자동 지급
CREATE OR REPLACE FUNCTION public.award_attendance_stardust()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reward integer;
  _title text;
BEGIN
  IF NEW.attended AND NOT COALESCE(OLD.attended, false) THEN
    IF EXISTS (
      SELECT 1 FROM public.stardust_ledger
      WHERE user_id = NEW.user_id AND activity_id = NEW.activity_id AND amount > 0
    ) THEN
      RETURN NEW;
    END IF;

    SELECT stardust_reward, title INTO _reward, _title
    FROM public.activities WHERE id = NEW.activity_id;

    IF COALESCE(_reward, 0) > 0 THEN
      INSERT INTO public.stardust_balances (user_id, balance)
      VALUES (NEW.user_id, _reward)
      ON CONFLICT (user_id) DO UPDATE
        SET balance = public.stardust_balances.balance + _reward,
            updated_at = now();

      INSERT INTO public.stardust_ledger (user_id, amount, reason, activity_id)
      VALUES (NEW.user_id, _reward, COALESCE(_title, '활동') || ' 출석', NEW.activity_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_attendance_stardust ON public.activity_signups;
CREATE TRIGGER award_attendance_stardust
AFTER UPDATE ON public.activity_signups
FOR EACH ROW EXECUTE FUNCTION public.award_attendance_stardust();

-- 천체 뽑기 (서버에서 추첨 · 별가루 차감)
CREATE OR REPLACE FUNCTION public.draw_celestial()
RETURNS TABLE (
  object_id uuid,
  name text,
  latin_name text,
  summary text,
  scale text,
  kind_code text,
  subtype text,
  rarity text,
  balance integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _balance integer;
  _w_solar numeric := 0;
  _w_stellar numeric := 0;
  _w_galactic numeric := 0;
  _total numeric;
  _roll numeric;
  _scale text;
  _pick public.celestial_objects%ROWTYPE;
  _rarity text;
BEGIN
  IF _uid IS NULL OR NOT public.is_verified_member(_uid) THEN
    RAISE EXCEPTION '명부 인증된 부원만 이용할 수 있습니다.';
  END IF;

  INSERT INTO public.stardust_balances (user_id, balance)
  VALUES (_uid, 0) ON CONFLICT (user_id) DO NOTHING;

  SELECT b.balance INTO _balance
  FROM public.stardust_balances b WHERE b.user_id = _uid FOR UPDATE;

  IF COALESCE(_balance, 0) < 1 THEN
    RAISE EXCEPTION '별가루가 부족합니다.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.celestial_objects o WHERE o.scale = 'solar'
             AND NOT EXISTS (SELECT 1 FROM public.user_celestial_objects u WHERE u.user_id = _uid AND u.object_id = o.id))
  THEN _w_solar := 60; END IF;
  IF EXISTS (SELECT 1 FROM public.celestial_objects o WHERE o.scale = 'stellar'
             AND NOT EXISTS (SELECT 1 FROM public.user_celestial_objects u WHERE u.user_id = _uid AND u.object_id = o.id))
  THEN _w_stellar := 30; END IF;
  IF EXISTS (SELECT 1 FROM public.celestial_objects o WHERE o.scale = 'galactic'
             AND NOT EXISTS (SELECT 1 FROM public.user_celestial_objects u WHERE u.user_id = _uid AND u.object_id = o.id))
  THEN _w_galactic := 10; END IF;

  _total := _w_solar + _w_stellar + _w_galactic;
  IF _total = 0 THEN
    RAISE EXCEPTION '모든 천체를 수집했습니다.';
  END IF;

  _roll := random() * _total;
  IF _roll < _w_solar THEN
    _scale := 'solar'; _rarity := 'common';
  ELSIF _roll < _w_solar + _w_stellar THEN
    _scale := 'stellar'; _rarity := 'rare';
  ELSE
    _scale := 'galactic'; _rarity := 'epic';
  END IF;

  SELECT o.* INTO _pick
  FROM public.celestial_objects o
  WHERE o.scale = _scale
    AND NOT EXISTS (SELECT 1 FROM public.user_celestial_objects u WHERE u.user_id = _uid AND u.object_id = o.id)
  ORDER BY random() LIMIT 1;

  INSERT INTO public.user_celestial_objects (user_id, object_id, rarity)
  VALUES (_uid, _pick.id, _rarity);

  UPDATE public.stardust_balances b
  SET balance = b.balance - 1, updated_at = now()
  WHERE b.user_id = _uid
  RETURNING b.balance INTO _balance;

  INSERT INTO public.stardust_ledger (user_id, amount, reason)
  VALUES (_uid, -1, '천체 뽑기 · ' || _pick.name);

  RETURN QUERY SELECT _pick.id, _pick.name, _pick.latin_name, _pick.summary,
                      _pick.scale, _pick.kind_code, _pick.subtype, _rarity, _balance;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.draw_celestial() FROM anon;
GRANT EXECUTE ON FUNCTION public.draw_celestial() TO authenticated;
