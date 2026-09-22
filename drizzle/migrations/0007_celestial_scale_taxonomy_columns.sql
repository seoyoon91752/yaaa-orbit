ALTER TABLE public.celestial_objects
  ADD COLUMN IF NOT EXISTS scale text NOT NULL DEFAULT 'solar',
  ADD COLUMN IF NOT EXISTS kind_code text NOT NULL DEFAULT 'star',
  ADD COLUMN IF NOT EXISTS subtype text,
  ADD COLUMN IF NOT EXISTS ra text,
  ADD COLUMN IF NOT EXISTS decl text;

UPDATE public.celestial_objects
SET scale = CASE WHEN kind::text IN ('nebula', 'cluster') THEN 'stellar' ELSE 'solar' END,
    kind_code = CASE kind::text WHEN 'nebula' THEN 'nebula' WHEN 'cluster' THEN 'cluster' ELSE 'star' END;

COMMENT ON COLUMN public.celestial_objects.kind IS 'DEPRECATED: replaced by scale + kind_code';
