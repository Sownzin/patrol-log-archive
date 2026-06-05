
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS setor text;

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE POLICY "View own roles or admin views all" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Make existing user "victor" admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) IN ('victor', 'victor@pmesp.local', 'victor@local')
   OR lower(split_part(email, '@', 1)) = 'victor'
ON CONFLICT DO NOTHING;

-- Cargos system
CREATE TABLE public.cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT '#6b7280',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cargos TO authenticated;
GRANT ALL ON public.cargos TO service_role;

ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view cargos" ON public.cargos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage cargos" ON public.cargos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_cargos_updated_at BEFORE UPDATE ON public.cargos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_cargos (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo_id uuid NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, cargo_id)
);

GRANT SELECT ON public.user_cargos TO authenticated;
GRANT ALL ON public.user_cargos TO service_role;

ALTER TABLE public.user_cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view user_cargos" ON public.user_cargos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage user_cargos" ON public.user_cargos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
