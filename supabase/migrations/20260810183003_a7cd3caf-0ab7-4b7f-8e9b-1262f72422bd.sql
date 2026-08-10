-- ENUM de papéis
CREATE TYPE public.app_role AS ENUM ('proprietario', 'administrador', 'recepcionista');

-- Estabelecimentos (tenants)
CREATE TABLE public.establishments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  currency TEXT NOT NULL DEFAULT 'AOA',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfis
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Papéis por utilizador e estabelecimento
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, establishment_id, role)
);

-- Auditoria estrutural
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
  actor_id UUID,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_establishment ON public.profiles(establishment_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_audit_logs_establishment ON public.audit_logs(establishment_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.establishments TO authenticated;
GRANT ALL ON public.establishments TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- Funções auxiliares (security definer, evitam recursão em RLS)
CREATE OR REPLACE FUNCTION public.current_establishment_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT establishment_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _establishment_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND establishment_id = _establishment_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_manager(_user_id UUID, _establishment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND establishment_id = _establishment_id
      AND role IN ('proprietario', 'administrador')
  )
$$;

ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Establishments
CREATE POLICY "establishments_select_members" ON public.establishments
FOR SELECT TO authenticated
USING (id = public.current_establishment_id() OR created_by = auth.uid());

CREATE POLICY "establishments_insert_self" ON public.establishments
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "establishments_update_managers" ON public.establishments
FOR UPDATE TO authenticated
USING (public.is_manager(auth.uid(), id))
WITH CHECK (public.is_manager(auth.uid(), id));

-- Profiles
CREATE POLICY "profiles_select_own_or_team" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR (establishment_id IS NOT NULL AND establishment_id = public.current_establishment_id())
);

CREATE POLICY "profiles_insert_self" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- User roles
CREATE POLICY "user_roles_select_team" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR establishment_id = public.current_establishment_id());

CREATE POLICY "user_roles_insert_owner_or_manager" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  public.is_manager(auth.uid(), establishment_id)
  OR EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = establishment_id AND e.created_by = auth.uid()
  )
);

CREATE POLICY "user_roles_update_managers" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.is_manager(auth.uid(), establishment_id))
WITH CHECK (public.is_manager(auth.uid(), establishment_id));

CREATE POLICY "user_roles_delete_managers" ON public.user_roles
FOR DELETE TO authenticated
USING (public.is_manager(auth.uid(), establishment_id));

-- Audit logs
CREATE POLICY "audit_logs_select_managers" ON public.audit_logs
FOR SELECT TO authenticated
USING (establishment_id = public.current_establishment_id() AND public.is_manager(auth.uid(), establishment_id));

CREATE POLICY "audit_logs_insert_members" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (establishment_id = public.current_establishment_id() AND actor_id = auth.uid());

-- updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_establishments_updated_at BEFORE UPDATE ON public.establishments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Criação automática de perfil no registo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();