
CREATE TABLE public.viatura_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horario_entrada TEXT NOT NULL,
  horario_saida TEXT NOT NULL,
  setor_batalhao TEXT NOT NULL,
  prefixo TEXT NOT NULL,
  placa TEXT NOT NULL,
  observacoes TEXT,
  num_prisoes INTEGER NOT NULL DEFAULT 0,
  dinheiro_sujo INTEGER NOT NULL DEFAULT 0,
  cocaina INTEGER NOT NULL DEFAULT 0,
  maconha INTEGER NOT NULL DEFAULT 0,
  metanfetamina INTEGER NOT NULL DEFAULT 0,
  five_seven INTEGER NOT NULL DEFAULT 0,
  ak47 INTEGER NOT NULL DEFAULT 0,
  uzi INTEGER NOT NULL DEFAULT 0,
  pdw INTEGER NOT NULL DEFAULT 0,
  municao_380 INTEGER NOT NULL DEFAULT 0,
  municao_762 INTEGER NOT NULL DEFAULT 0,
  ticket_corrida INTEGER NOT NULL DEFAULT 0,
  lockpick INTEGER NOT NULL DEFAULT 0,
  diamantes INTEGER NOT NULL DEFAULT 0,
  c4 INTEGER NOT NULL DEFAULT 0,
  motorista TEXT NOT NULL,
  chefe_barca TEXT NOT NULL,
  auxiliar TEXT,
  anotador TEXT,
  status TEXT NOT NULL DEFAULT 'finalizado' CHECK (status IN ('finalizado','arquivado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.viatura_reports TO authenticated;
GRANT ALL ON public.viatura_reports TO service_role;

ALTER TABLE public.viatura_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own viatura reports" ON public.viatura_reports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX viatura_reports_user_status_idx ON public.viatura_reports(user_id, status);

CREATE TRIGGER update_viatura_reports_updated_at
  BEFORE UPDATE ON public.viatura_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
