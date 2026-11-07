-- Security hardening: prevent authenticated users from moving their own profile
-- to a different establishment, which could change the tenant context used by
-- current_establishment_id() and the operational RLS policies.
--
-- This migration is intentionally isolated for review. It must be applied only
-- after confirming the production migration runner and testing onboarding,
-- invite acceptance, and existing accounts in a non-production environment.

CREATE OR REPLACE FUNCTION public.guard_profile_establishment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  jwt_role text;
BEGIN
  IF NEW.establishment_id IS NOT DISTINCT FROM OLD.establishment_id THEN
    RETURN NEW;
  END IF;

  jwt_role := nullif(current_setting('request.jwt.claim.role', true), '');

  -- Trusted database/admin and service-role operations may perform controlled
  -- profile association work (including the auth invite-acceptance trigger).
  -- Explicitly do not grant this bypass to the anon role.
  IF auth.uid() IS NULL AND (jwt_role IS NULL OR jwt_role = 'service_role') THEN
    RETURN NEW;
  END IF;

  -- The only permitted client-side change is the initial association of the
  -- caller's own profile with an establishment they just created.
  IF auth.uid() IS NOT NULL
     AND NEW.id = auth.uid()
     AND OLD.establishment_id IS NULL
     AND NEW.establishment_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.establishments e
       WHERE e.id = NEW.establishment_id
         AND e.created_by = auth.uid()
     )
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Não é permitido alterar o estabelecimento associado a este perfil.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_establishment_change ON public.profiles;

CREATE TRIGGER trg_guard_profile_establishment_change
BEFORE UPDATE OF establishment_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_establishment_change();

COMMENT ON FUNCTION public.guard_profile_establishment_change() IS
  'Prevents authenticated users from changing their profile tenant association except for initial owner onboarding.';
