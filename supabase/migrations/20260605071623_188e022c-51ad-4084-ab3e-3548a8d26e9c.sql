
ALTER TABLE public.viatura_reports ADD COLUMN IF NOT EXISTS colaboradores text[] NOT NULL DEFAULT '{}';

DROP POLICY IF EXISTS "Users manage own viatura reports" ON public.viatura_reports;

CREATE POLICY "Owner full access viatura"
  ON public.viatura_reports
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone authenticated can view open patrols"
  ON public.viatura_reports
  FOR SELECT
  TO authenticated
  USING (status = 'patrulhando');

CREATE POLICY "Anyone authenticated can update open patrols"
  ON public.viatura_reports
  FOR UPDATE
  TO authenticated
  USING (status = 'patrulhando')
  WITH CHECK (status IN ('patrulhando','finalizado'));
