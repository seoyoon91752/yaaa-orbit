CREATE OR REPLACE FUNCTION public.grant_stardust(_user_id uuid, _amount integer, _reason text, _activity_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _balance integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION '권한이 없습니다.';
  END IF;
  IF _amount = 0 THEN
    RAISE EXCEPTION '지급할 별가루 개수를 입력해 주세요.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'verified') THEN
    RAISE EXCEPTION '인증된 부원만 지급 대상이 될 수 있습니다.';
  END IF;

  INSERT INTO public.stardust_balances (user_id, balance, updated_at)
  VALUES (_user_id, _amount, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.stardust_balances.balance + EXCLUDED.balance,
        updated_at = now()
  RETURNING balance INTO _balance;

  IF _balance < 0 THEN
    RAISE EXCEPTION '보유한 별가루보다 많이 차감할 수 없습니다.';
  END IF;

  INSERT INTO public.stardust_ledger (user_id, amount, reason, activity_id)
  VALUES (_user_id, _amount, COALESCE(NULLIF(btrim(_reason), ''), '관리자 지급'), _activity_id);

  RETURN _balance;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_stardust(uuid, integer, text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.grant_stardust(uuid, integer, text, uuid) TO authenticated;