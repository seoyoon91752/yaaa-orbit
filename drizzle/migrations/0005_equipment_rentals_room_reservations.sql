CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

CREATE TYPE public.equipment_status AS ENUM ('available', 'rented', 'maintenance', 'broken');
CREATE TYPE public.rental_status AS ENUM ('pending', 'approved', 'rejected', 'returned', 'cancelled');

-- ===== equipment =====
CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT '망원경',
  status public.equipment_status NOT NULL DEFAULT 'available',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT ALL ON public.equipment TO service_role;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verified members read equipment" ON public.equipment
  FOR SELECT TO authenticated USING (public.is_verified_member(auth.uid()));
CREATE POLICY "officers manage equipment" ON public.equipment
  FOR ALL TO authenticated
  USING (public.is_officer(auth.uid()))
  WITH CHECK (public.is_officer(auth.uid()));

CREATE TRIGGER touch_equipment BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== equipment rentals =====
CREATE TABLE public.equipment_rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  purpose text NOT NULL,
  status public.rental_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  return_note text,
  returned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rental_dates_valid CHECK (end_date >= start_date)
);

-- server-side double booking guard: no overlapping active rentals per equipment
ALTER TABLE public.equipment_rentals
  ADD CONSTRAINT equipment_rentals_no_overlap
  EXCLUDE USING gist (
    equipment_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  ) WHERE (status IN ('pending', 'approved'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_rentals TO authenticated;
GRANT ALL ON public.equipment_rentals TO service_role;
ALTER TABLE public.equipment_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own or officer read rentals" ON public.equipment_rentals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_officer(auth.uid()));
CREATE POLICY "members request rentals" ON public.equipment_rentals
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_verified_member(auth.uid())
    AND status = 'pending'
  );
CREATE POLICY "officers update rentals" ON public.equipment_rentals
  FOR UPDATE TO authenticated
  USING (public.is_officer(auth.uid()))
  WITH CHECK (public.is_officer(auth.uid()));
CREATE POLICY "own pending rentals deletable" ON public.equipment_rentals
  FOR DELETE TO authenticated
  USING ((user_id = auth.uid() AND status = 'pending') OR public.is_officer(auth.uid()));

CREATE TRIGGER touch_equipment_rentals BEFORE UPDATE ON public.equipment_rentals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- block requests on unusable equipment + keep equipment status in sync
CREATE OR REPLACE FUNCTION public.guard_rental_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.equipment_status;
BEGIN
  SELECT status INTO v_status FROM public.equipment WHERE id = NEW.equipment_id;
  IF v_status IN ('maintenance', 'broken') THEN
    RAISE EXCEPTION '점검중이거나 고장난 장비는 대여 신청할 수 없습니다.';
  END IF;
  IF NEW.start_date < current_date THEN
    RAISE EXCEPTION '대여 시작일은 오늘 이후여야 합니다.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_rental_request BEFORE INSERT ON public.equipment_rentals
  FOR EACH ROW EXECUTE FUNCTION public.guard_rental_request();

CREATE OR REPLACE FUNCTION public.sync_equipment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    UPDATE public.equipment SET status = 'rented'
      WHERE id = NEW.equipment_id AND status = 'available';
  ELSIF NEW.status IN ('returned', 'rejected', 'cancelled') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.equipment_rentals
      WHERE equipment_id = NEW.equipment_id AND id <> NEW.id AND status = 'approved'
    ) THEN
      UPDATE public.equipment SET status = 'available'
        WHERE id = NEW.equipment_id AND status = 'rented';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_equipment_status AFTER UPDATE OF status ON public.equipment_rentals
  FOR EACH ROW EXECUTE FUNCTION public.sync_equipment_status();

-- ===== room reservations =====
CREATE TABLE public.room_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  purpose text NOT NULL,
  headcount integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservation_range_valid CHECK (ends_at > starts_at),
  CONSTRAINT reservation_headcount_valid CHECK (headcount BETWEEN 1 AND 100)
);

ALTER TABLE public.room_reservations
  ADD CONSTRAINT room_reservations_no_overlap
  EXCLUDE USING gist (tstzrange(starts_at, ends_at) WITH &&);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_reservations TO authenticated;
GRANT ALL ON public.room_reservations TO service_role;
ALTER TABLE public.room_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own or officer read reservations" ON public.room_reservations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_officer(auth.uid()));
CREATE POLICY "members create reservations" ON public.room_reservations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_verified_member(auth.uid()));
CREATE POLICY "own or officer update reservations" ON public.room_reservations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_officer(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_officer(auth.uid()));
CREATE POLICY "own or officer delete reservations" ON public.room_reservations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_officer(auth.uid()));

CREATE TRIGGER touch_room_reservations BEFORE UPDATE ON public.room_reservations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- busy-slot view for members: hides other members' personal details
CREATE OR REPLACE FUNCTION public.list_room_slots(_from timestamptz, _to timestamptz)
RETURNS TABLE (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  is_mine boolean,
  can_manage boolean,
  user_name text,
  purpose text,
  headcount integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.starts_at,
    r.ends_at,
    r.user_id = auth.uid() AS is_mine,
    (r.user_id = auth.uid() OR public.is_officer(auth.uid())) AS can_manage,
    CASE WHEN r.user_id = auth.uid() OR public.is_officer(auth.uid()) THEN r.user_name END,
    CASE WHEN r.user_id = auth.uid() OR public.is_officer(auth.uid()) THEN r.purpose END,
    CASE WHEN r.user_id = auth.uid() OR public.is_officer(auth.uid()) THEN r.headcount END
  FROM public.room_reservations r
  WHERE public.is_verified_member(auth.uid())
    AND r.starts_at < _to
    AND r.ends_at > _from
  ORDER BY r.starts_at
$$;

REVOKE EXECUTE ON FUNCTION public.list_room_slots(timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.guard_rental_request() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_equipment_status() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_room_slots(timestamptz, timestamptz) TO authenticated;
