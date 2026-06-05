
CREATE TABLE public.patrol_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rg TEXT NOT NULL,
  nome_guerra TEXT NOT NULL,
  graduacao TEXT NOT NULL,
  viatura TEXT NOT NULL,
  equipe TEXT NOT NULL,
  inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim TIMESTAMPTZ,
  km_inicial INTEGER NOT NULL,
  km_final INTEGER,
  ocorrencias TEXT,
  status TEXT NOT NULL DEFAULT 'patrulhando' CHECK (status IN ('patrulhando','finalizado','arquivado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patrol_reports TO authenticated;
GRANT ALL ON public.patrol_reports TO service_role;

ALTER TABLE public.patrol_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reports" ON public.patrol_reports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX patrol_reports_user_status_idx ON public.patrol_reports(user_id, status);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_patrol_reports_updated_at
  BEFORE UPDATE ON public.patrol_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
