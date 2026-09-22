CREATE TYPE public.celestial_kind AS ENUM ('constellation', 'star', 'nebula', 'cluster');

-- ===== activities =====
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT '관측회',
  location text,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  apply_deadline timestamptz NOT NULL,
  capacity integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verified members read activities" ON public.activities
  FOR SELECT TO authenticated USING (public.is_verified_member(auth.uid()));
CREATE POLICY "officers manage activities" ON public.activities
  FOR ALL TO authenticated
  USING (public.is_officer(auth.uid()))
  WITH CHECK (public.is_officer(auth.uid()));

CREATE TRIGGER touch_activities BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== activity signups =====
CREATE TABLE public.activity_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  attended boolean NOT NULL DEFAULT false,
  attended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_signups TO authenticated;
GRANT ALL ON public.activity_signups TO service_role;
ALTER TABLE public.activity_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own or officer read signups" ON public.activity_signups
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_officer(auth.uid()));
CREATE POLICY "members sign up" ON public.activity_signups
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_verified_member(auth.uid())
    AND attended = false
  );
CREATE POLICY "officers update signups" ON public.activity_signups
  FOR UPDATE TO authenticated
  USING (public.is_officer(auth.uid()))
  WITH CHECK (public.is_officer(auth.uid()));
CREATE POLICY "own or officer delete signups" ON public.activity_signups
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_officer(auth.uid()));

-- server-side deadline + capacity enforcement
CREATE OR REPLACE FUNCTION public.guard_activity_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline timestamptz;
  v_capacity integer;
  v_count integer;
BEGIN
  SELECT apply_deadline, capacity INTO v_deadline, v_capacity
  FROM public.activities WHERE id = NEW.activity_id;

  IF v_deadline IS NULL THEN
    RAISE EXCEPTION '존재하지 않는 활동입니다.';
  END IF;

  IF now() > v_deadline THEN
    RAISE EXCEPTION '신청이 마감된 활동입니다.';
  END IF;

  IF v_capacity IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.activity_signups WHERE activity_id = NEW.activity_id;
    IF v_count >= v_capacity THEN
      RAISE EXCEPTION '정원이 가득 찼습니다.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_activity_signup BEFORE INSERT ON public.activity_signups
  FOR EACH ROW EXECUTE FUNCTION public.guard_activity_signup();

-- members may cancel only before the deadline; officers always may
CREATE OR REPLACE FUNCTION public.guard_activity_signup_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline timestamptz;
BEGIN
  IF public.is_officer(auth.uid()) THEN
    RETURN OLD;
  END IF;
  SELECT apply_deadline INTO v_deadline FROM public.activities WHERE id = OLD.activity_id;
  IF v_deadline IS NOT NULL AND now() > v_deadline THEN
    RAISE EXCEPTION '마감된 활동은 취소할 수 없습니다. 운영진에게 문의해 주세요.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER guard_activity_signup_cancel BEFORE DELETE ON public.activity_signups
  FOR EACH ROW EXECUTE FUNCTION public.guard_activity_signup_cancel();

-- signup counts without exposing other members' identities
CREATE OR REPLACE FUNCTION public.activity_signup_counts()
RETURNS TABLE (activity_id uuid, signup_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.activity_id, count(*)
  FROM public.activity_signups s
  WHERE public.is_verified_member(auth.uid())
  GROUP BY s.activity_id
$$;

-- ===== celestial catalog =====
CREATE TABLE public.celestial_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.celestial_kind NOT NULL,
  name text NOT NULL,
  latin_name text,
  summary text,
  description text,
  image_url text,
  best_season text,
  direction text,
  magnitude text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.celestial_objects TO authenticated;
GRANT ALL ON public.celestial_objects TO service_role;
ALTER TABLE public.celestial_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verified members read catalog" ON public.celestial_objects
  FOR SELECT TO authenticated USING (public.is_verified_member(auth.uid()));
CREATE POLICY "officers manage catalog" ON public.celestial_objects
  FOR ALL TO authenticated
  USING (public.is_officer(auth.uid()))
  WITH CHECK (public.is_officer(auth.uid()));

CREATE TRIGGER touch_celestial_objects BEFORE UPDATE ON public.celestial_objects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

REVOKE EXECUTE ON FUNCTION public.guard_activity_signup() FROM anon;
REVOKE EXECUTE ON FUNCTION public.guard_activity_signup_cancel() FROM anon;
REVOKE EXECUTE ON FUNCTION public.activity_signup_counts() FROM anon;
GRANT EXECUTE ON FUNCTION public.activity_signup_counts() TO authenticated;

INSERT INTO public.celestial_objects (kind, name, latin_name, summary, description, best_season, direction, magnitude) VALUES
('constellation', '오리온자리', 'Orion', '겨울 밤하늘의 기준점이 되는 사냥꾼 별자리', '삼태성이라 부르는 세 별이 허리띠를 이루며, 그 아래 오리온 대성운(M42)이 자리합니다. 초보 관측자가 겨울 하늘에서 방향을 잡을 때 가장 먼저 찾는 별자리입니다.', '12월 ~ 2월', '남쪽 하늘', '−'),
('constellation', '카시오페이아자리', 'Cassiopeia', 'W자 모양으로 북극성을 찾는 길잡이', '북쪽 하늘에서 1년 내내 볼 수 있는 주극성좌로, W(또는 M) 모양의 다섯 별이 특징입니다. 북두칠성이 지평선 근처일 때 북극성을 찾는 기준이 됩니다.', '연중 (가을 최적)', '북쪽 하늘', '−'),
('constellation', '큰곰자리', 'Ursa Major', '북두칠성을 품은 봄철의 대표 별자리', '국자 모양의 북두칠성이 포함되어 있으며, 국자 끝 두 별을 이으면 북극성에 닿습니다. 미자르와 알코르는 맨눈 이중성 관측 연습에 좋습니다.', '3월 ~ 6월', '북쪽 하늘 높은 곳', '−'),
('constellation', '백조자리', 'Cygnus', '여름 은하수를 가로지르는 북십자성', '데네브를 꼬리로 한 십자 형태가 은하수 위에 놓여 있습니다. 베가, 알타이르와 함께 여름철 대삼각형을 이룹니다.', '7월 ~ 9월', '머리 위 ~ 남쪽', '−'),
('constellation', '전갈자리', 'Scorpius', '붉은 안타레스가 심장처럼 빛나는 여름 별자리', '남쪽 지평선 가까이 낮게 뜨며, 갈고리처럼 휘어진 꼬리가 뚜렷합니다. 주변에 산개성단이 밀집해 쌍안경 관측에 좋습니다.', '6월 ~ 8월', '남쪽 낮은 하늘', '−');

INSERT INTO public.celestial_objects (kind, name, latin_name, summary, description, best_season, direction, magnitude) VALUES
('star', '시리우스', 'Sirius', '밤하늘에서 가장 밝은 항성', '큰개자리의 알파성으로 지구에서 약 8.6광년 떨어져 있습니다. 대기 요동에 따라 색이 무지개처럼 흔들려 보이는 현상이 자주 관측됩니다.', '12월 ~ 3월', '남동쪽 ~ 남쪽', '−1.46'),
('star', '베가 (직녀성)', 'Vega', '여름철 대삼각형의 기준별', '거문고자리 알파성으로 0등급의 푸른 백색 별입니다. 약 1만 2천 년 뒤에는 세차운동으로 북극성 자리를 대신하게 됩니다.', '6월 ~ 9월', '머리 위', '0.03'),
('star', '베텔게우스', 'Betelgeuse', '언젠가 초신성이 될 붉은 초거성', '오리온자리의 어깨에 해당하는 적색 초거성으로, 밝기가 불규칙하게 변합니다. 2019년 대감광 당시 전 세계 아마추어 관측자들이 광도 곡선을 기록했습니다.', '12월 ~ 2월', '남쪽 하늘', '0.0 ~ 1.6 (변광)'),
('star', '폴라리스 (북극성)', 'Polaris', '천구 북극에 가장 가까운 길잡이 별', '작은곰자리 알파성으로 거의 움직이지 않아 방위 기준이 됩니다. 실제로는 세 개의 별로 이루어진 다중성계입니다.', '연중', '정북쪽', '1.98'),
('star', '알타이르 (견우성)', 'Altair', '빠르게 자전하는 여름의 밝은 별', '독수리자리 알파성으로 자전 속도가 매우 빨라 적도가 부풀어 있습니다. 베가, 데네브와 함께 여름철 대삼각형을 이룹니다.', '7월 ~ 9월', '남쪽 ~ 머리 위', '0.76');

INSERT INTO public.celestial_objects (kind, name, latin_name, summary, description, best_season, direction, magnitude) VALUES
('nebula', '오리온 대성운', 'M42 · Orion Nebula', '맨눈으로도 보이는 별 탄생의 현장', '오리온의 검 부분에 위치한 발광성운으로, 중심의 트라페지움 사중성이 성운을 밝힙니다. 소형 망원경으로도 날개 형태의 구조가 드러납니다.', '12월 ~ 2월', '남쪽 하늘', '4.0'),
('nebula', '고리성운', 'M57 · Ring Nebula', '작은 도넛처럼 보이는 행성상성운', '거문고자리에 있는 행성상성운으로, 죽어가는 별이 뿜어낸 껍질입니다. 구경 100mm 이상이면 고리 형태가 또렷합니다.', '6월 ~ 9월', '머리 위', '8.8'),
('nebula', '삼렬성운', 'M20 · Trifid Nebula', '세 갈래로 갈라진 붉은 성운', '궁수자리 방향에 있으며 발광성운과 반사성운이 함께 보이는 드문 대상입니다. 어두운 하늘에서 사진 촬영 대상으로 인기가 높습니다.', '7월 ~ 8월', '남쪽 낮은 하늘', '6.3'),
('nebula', '북아메리카성운', 'NGC 7000', '대륙 윤곽을 닮은 광대한 성운', '백조자리 데네브 근처에 펼쳐진 거대한 발광성운으로, 시야가 넓은 쌍안경이나 광각 촬영에 적합합니다.', '8월 ~ 10월', '머리 위', '4.0'),
('nebula', '게성운', 'M1 · Crab Nebula', '1054년 초신성의 잔해', '황소자리에 있는 초신성 잔해로 중심에 펄사가 존재합니다. 메시에 목록의 첫 번째 천체입니다.', '11월 ~ 2월', '남쪽 하늘', '8.4');

INSERT INTO public.celestial_objects (kind, name, latin_name, summary, description, best_season, direction, magnitude) VALUES
('cluster', '플레이아데스 (좀생이별)', 'M45 · Pleiades', '맨눈으로 여섯 일곱 별이 보이는 산개성단', '황소자리에 위치한 젊은 산개성단으로, 쌍안경으로 볼 때 가장 아름다운 대상 중 하나로 꼽힙니다. 주변의 푸른 반사성운도 장노출로 담을 수 있습니다.', '11월 ~ 2월', '남쪽 ~ 머리 위', '1.6'),
('cluster', '히아데스', 'Hyades', '황소의 얼굴을 이루는 V자 성단', '지구에서 가장 가까운 산개성단으로 시야가 넓어 쌍안경 관측에 적합합니다. 알데바란은 성단 구성원이 아니라 앞쪽에 겹쳐 보이는 별입니다.', '11월 ~ 2월', '남쪽 하늘', '0.5'),
('cluster', '헤르쿨레스 구상성단', 'M13', '북반구 최고의 구상성단', '수십만 개의 별이 공처럼 뭉친 구상성단으로, 구경 150mm 이상이면 가장자리 별이 낱낱이 분해되어 보입니다.', '5월 ~ 8월', '머리 위', '5.8'),
('cluster', '이중성단', 'NGC 869 / 884', '나란히 놓인 두 개의 산개성단', '페르세우스자리와 카시오페이아자리 사이에 있으며, 저배율 광시야에서 두 성단이 한 시야에 들어옵니다.', '9월 ~ 12월', '북동쪽 하늘', '4.3'),
('cluster', 'M11 야생오리성단', 'M11 · Wild Duck Cluster', '별이 조밀하게 모인 산개성단', '방패자리에 있으며 별들의 배열이 날아가는 오리 떼를 닮아 붙은 이름입니다. 은하수 한가운데에 있어 배경 별과의 대비가 인상적입니다.', '7월 ~ 9월', '남쪽 하늘', '5.8');
