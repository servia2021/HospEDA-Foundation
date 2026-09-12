-- Convites de equipa por estabelecimento (multi-tenant, RLS)
CREATE TABLE public.establishment_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  invited_by UUID NOT NULL,
  accepted_user_id UUID,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT establishment_invites_role_ck CHECK (role <> 'proprietario'),
  CONSTRAINT establishment_invites_status_ck CHECK (status IN ('pendente', 'aceite', 'cancelado'))
);

CREATE UNIQUE INDEX establishment_invites_pending_uq
  ON public.establishment_invites (establishment_id, lower(email))
  WHERE status = 'pendente';

CREATE INDEX establishment_invites_email_idx
  ON public.establishment_invites (lower(email))
  WHERE status = 'pendente';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.establishment_invites TO authenticated;
GRANT ALL ON public.establishment_invites TO service_role;

ALTER TABLE public.establishment_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY establishment_invites_select_managers ON public.establishment_invites
  FOR SELECT TO authenticated
  USING (establishment_id = public.current_establishment_id()
         AND public.is_manager(auth.uid(), establishment_id));

CREATE POLICY establishment_invites_insert_managers ON public.establishment_invites
  FOR INSERT TO authenticated
  WITH CHECK (establishment_id = public.current_establishment_id()
              AND public.is_manager(auth.uid(), establishment_id)
              AND invited_by = auth.uid()
              AND status = 'pendente');

CREATE POLICY establishment_invites_update_managers ON public.establishment_invites
  FOR UPDATE TO authenticated
  USING (establishment_id = public.current_establishment_id()
         AND public.is_manager(auth.uid(), establishment_id))
  WITH CHECK (establishment_id = public.current_establishment_id()
              AND public.is_manager(auth.uid(), establishment_id));

CREATE POLICY establishment_invites_delete_managers ON public.establishment_invites
  FOR DELETE TO authenticated
  USING (establishment_id = public.current_establishment_id()
         AND public.is_manager(auth.uid(), establishment_id));

CREATE TRIGGER trg_establishment_invites_updated_at
  BEFORE UPDATE ON public.establishment_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auditoria automática de convites
CREATE OR REPLACE FUNCTION public.audit_invite_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (establishment_id, actor_id, action, entity, entity_id, metadata)
    VALUES (NEW.establishment_id, auth.uid(), 'equipa.convite_criado', 'establishment_invites',
            NEW.id::text, jsonb_build_object('email', NEW.email, 'papel', NEW.role::text));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_logs (establishment_id, actor_id, action, entity, entity_id, metadata)
    VALUES (NEW.establishment_id, auth.uid(), 'equipa.convite_' || NEW.status, 'establishment_invites',
            NEW.id::text, jsonb_build_object('email', NEW.email, 'papel', NEW.role::text));
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_establishment_invites_audit
  AFTER INSERT OR UPDATE ON public.establishment_invites
  FOR EACH ROW EXECUTE FUNCTION public.audit_invite_change();

-- Auditoria automática de papéis
CREATE OR REPLACE FUNCTION public.audit_user_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (establishment_id, actor_id, action, entity, entity_id, metadata)
    VALUES (NEW.establishment_id, auth.uid(), 'equipa.papel_atribuido', 'user_roles', NEW.id::text,
            jsonb_build_object('utilizador', NEW.user_id::text, 'papel', NEW.role::text));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (establishment_id, actor_id, action, entity, entity_id, metadata)
    VALUES (NEW.establishment_id, auth.uid(), 'equipa.papel_alterado', 'user_roles', NEW.id::text,
            jsonb_build_object('utilizador', NEW.user_id::text,
                               'papel', jsonb_build_object('de', OLD.role::text, 'para', NEW.role::text)));
    RETURN NEW;
  ELSE
    INSERT INTO public.audit_logs (establishment_id, actor_id, action, entity, entity_id, metadata)
    VALUES (OLD.establishment_id, auth.uid(), 'equipa.papel_removido', 'user_roles', OLD.id::text,
            jsonb_build_object('utilizador', OLD.user_id::text, 'papel', OLD.role::text));
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER trg_user_roles_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_role_change();

-- Novo utilizador aceita automaticamente um convite pendente para o seu email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv public.establishment_invites;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  IF NEW.email IS NOT NULL THEN
    SELECT * INTO inv
    FROM public.establishment_invites
    WHERE status = 'pendente' AND lower(email) = lower(NEW.email)
    ORDER BY created_at
    LIMIT 1;

    IF inv.id IS NOT NULL THEN
      UPDATE public.profiles SET establishment_id = inv.establishment_id WHERE id = NEW.id;

      INSERT INTO public.user_roles (user_id, establishment_id, role)
      VALUES (NEW.id, inv.establishment_id, inv.role)
      ON CONFLICT (user_id, role) DO NOTHING;

      UPDATE public.establishment_invites
      SET status = 'aceite', accepted_user_id = NEW.id, accepted_at = now()
      WHERE id = inv.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;