-- Protege o papel de Proprietário e impede atribuir papéis a contas de outro estabelecimento.
CREATE OR REPLACE FUNCTION public.guard_user_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_est uuid;
BEGIN
  -- Operações internas (serviço / gatilhos sem sessão) não são bloqueadas.
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'proprietario' THEN
      RAISE EXCEPTION 'O Proprietário não pode ser removido.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND (OLD.role = 'proprietario' OR NEW.role = 'proprietario') THEN
    RAISE EXCEPTION 'O papel de Proprietário não pode ser alterado.';
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.user_id IS DISTINCT FROM OLD.user_id
                           OR NEW.establishment_id IS DISTINCT FROM OLD.establishment_id) THEN
    RAISE EXCEPTION 'Alteração não permitida.';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role = 'proprietario' THEN
    IF NEW.user_id <> auth.uid() OR NOT EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.id = NEW.establishment_id AND e.created_by = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Apenas o criador do estabelecimento pode ser Proprietário.';
    END IF;
  END IF;

  SELECT establishment_id INTO target_est FROM public.profiles WHERE id = NEW.user_id;
  IF target_est IS NOT NULL AND target_est <> NEW.establishment_id THEN
    RAISE EXCEPTION 'Este utilizador pertence a outro estabelecimento.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_roles_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_role_change();
