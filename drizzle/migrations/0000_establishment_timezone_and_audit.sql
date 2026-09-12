ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Africa/Luanda',
  ADD COLUMN IF NOT EXISTS day_start_time TIME NOT NULL DEFAULT '00:00';

CREATE OR REPLACE FUNCTION public.audit_establishment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  changed jsonb := '{}'::jsonb;
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    changed := changed || jsonb_build_object('name', jsonb_build_object('de', OLD.name, 'para', NEW.name));
  END IF;
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    changed := changed || jsonb_build_object('phone', jsonb_build_object('de', OLD.phone, 'para', NEW.phone));
  END IF;
  IF NEW.city IS DISTINCT FROM OLD.city THEN
    changed := changed || jsonb_build_object('city', jsonb_build_object('de', OLD.city, 'para', NEW.city));
  END IF;
  IF NEW.address IS DISTINCT FROM OLD.address THEN
    changed := changed || jsonb_build_object('address', jsonb_build_object('de', OLD.address, 'para', NEW.address));
  END IF;
  IF NEW.timezone IS DISTINCT FROM OLD.timezone THEN
    changed := changed || jsonb_build_object('timezone', jsonb_build_object('de', OLD.timezone, 'para', NEW.timezone));
  END IF;
  IF NEW.day_start_time IS DISTINCT FROM OLD.day_start_time THEN
    changed := changed || jsonb_build_object('day_start_time', jsonb_build_object('de', OLD.day_start_time::text, 'para', NEW.day_start_time::text));
  END IF;

  IF changed <> '{}'::jsonb THEN
    INSERT INTO public.audit_logs (establishment_id, actor_id, action, entity, entity_id, metadata)
    VALUES (NEW.id, auth.uid(), 'establishment.updated', 'establishments', NEW.id::text, changed);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_establishments_audit ON public.establishments;
CREATE TRIGGER trg_establishments_audit
AFTER UPDATE ON public.establishments
FOR EACH ROW EXECUTE FUNCTION public.audit_establishment_update();