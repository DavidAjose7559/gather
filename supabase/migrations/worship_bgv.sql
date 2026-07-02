-- Ministers per event
CREATE TABLE IF NOT EXISTS public.worship_bgv_ministers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.worship_events ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Singers per minister
CREATE TABLE IF NOT EXISTS public.worship_bgv_singers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minister_id uuid REFERENCES public.worship_bgv_ministers ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  voice_part text NOT NULL CHECK (voice_part IN ('Soprano', 'Alto', 'Tenor', 'Bass')),
  created_at timestamptz DEFAULT now()
);

-- Share token on events for BGV
ALTER TABLE public.worship_events
ADD COLUMN IF NOT EXISTS bgv_share_token text UNIQUE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_worship_events_bgv_share_token
ON public.worship_events(bgv_share_token);

-- RLS
ALTER TABLE public.worship_bgv_ministers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worship_bgv_singers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bgv_ministers_access" ON public.worship_bgv_ministers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_worship_team = true OR role = 'admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_worship_team = true OR role = 'admin'))
  );

CREATE POLICY "bgv_singers_access" ON public.worship_bgv_singers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_worship_team = true OR role = 'admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_worship_team = true OR role = 'admin'))
  );
