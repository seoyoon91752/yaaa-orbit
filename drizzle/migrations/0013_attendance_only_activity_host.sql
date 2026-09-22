-- 출석 체크(신청 내역 수정)는 그 활동을 연 사람 또는 최고관리자만
DROP POLICY IF EXISTS "officers update signups" ON public.activity_signups;

CREATE POLICY "host or admin update signups"
ON public.activity_signups
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.activities a
    WHERE a.id = activity_signups.activity_id AND a.created_by = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.activities a
    WHERE a.id = activity_signups.activity_id AND a.created_by = auth.uid()
  )
);
