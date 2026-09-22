CREATE OR REPLACE FUNCTION public.request_rental_return(_rental_id uuid, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_status public.rental_status;
BEGIN
  SELECT user_id, status INTO v_owner, v_status
  FROM public.equipment_rentals WHERE id = _rental_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION '대여 내역을 찾을 수 없습니다.';
  END IF;
  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION '본인의 대여만 반납 신청할 수 있습니다.';
  END IF;
  IF v_status <> 'approved' THEN
    RAISE EXCEPTION '승인된 대여만 반납 신청할 수 있습니다.';
  END IF;

  UPDATE public.equipment_rentals
  SET status = 'return_requested',
      return_note = NULLIF(btrim(coalesce(_note, '')), ''),
      updated_at = now()
  WHERE id = _rental_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_rental_return(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.request_rental_return(uuid, text) TO authenticated;