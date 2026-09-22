CREATE TABLE public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  title text NOT NULL,
  caption text,
  shot_at date,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_photos TO authenticated;
GRANT ALL ON public.gallery_photos TO service_role;

ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verified members read gallery" ON public.gallery_photos
  FOR SELECT TO authenticated USING (is_verified_member(auth.uid()));

CREATE POLICY "members upload gallery" ON public.gallery_photos
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_verified_member(auth.uid()));

CREATE POLICY "own update gallery" ON public.gallery_photos
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own or officer delete gallery" ON public.gallery_photos
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_officer(auth.uid()));

-- storage policies for the private gallery bucket
CREATE POLICY "verified members read gallery objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'gallery' AND is_verified_member(auth.uid()));

CREATE POLICY "verified members upload gallery objects" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gallery'
    AND is_verified_member(auth.uid())
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "own or officer delete gallery objects" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'gallery'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_officer(auth.uid()))
  );

-- award stardust for uploading a photo (server side, max 3 per day)
CREATE OR REPLACE FUNCTION public.award_gallery_stardust()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_count int;
  reward int := 1;
BEGIN
  SELECT count(*) INTO today_count
  FROM public.stardust_ledger
  WHERE user_id = NEW.user_id
    AND reason LIKE '갤러리 사진 업로드%'
    AND created_at >= date_trunc('day', now());

  IF today_count >= 3 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.stardust_balances (user_id, balance, updated_at)
  VALUES (NEW.user_id, reward, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.stardust_balances.balance + reward, updated_at = now();

  INSERT INTO public.stardust_ledger (user_id, amount, reason)
  VALUES (NEW.user_id, reward, '갤러리 사진 업로드 · ' || NEW.title);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_gallery_stardust
AFTER INSERT ON public.gallery_photos
FOR EACH ROW EXECUTE FUNCTION public.award_gallery_stardust();