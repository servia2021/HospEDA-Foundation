CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      ON CONFLICT (user_id, establishment_id, role) DO NOTHING;

      UPDATE public.establishment_invites
      SET status = 'aceite', accepted_user_id = NEW.id, accepted_at = now()
      WHERE id = inv.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
