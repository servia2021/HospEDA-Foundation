-- Cronómetro persistido e controlo remoto
ALTER TABLE public.stays
  ADD COLUMN IF NOT EXISTS contracted_minutes integer,
  ADD COLUMN IF NOT EXISTS overtime_minutes integer;

UPDATE public.stays
SET contracted_minutes = greatest(1, ceil(extract(epoch FROM (expected_checkout_at - started_at)) / 60)::integer)
WHERE contracted_minutes IS NULL;

CREATE OR REPLACE FUNCTION public.stays_set_contracted_minutes()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.contracted_minutes IS NULL THEN
    NEW.contracted_minutes := greatest(1, ceil(extract(epoch FROM (NEW.expected_checkout_at - NEW.started_at)) / 60)::integer);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_stays_contracted_minutes BEFORE INSERT ON public.stays
  FOR EACH ROW EXECUTE FUNCTION public.stays_set_contracted_minutes();

-- Início do dia operacional atual do estabelecimento do utilizador
CREATE OR REPLACE FUNCTION public.op_current_day_start()
RETURNS timestamptz LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE e public.establishments; local_now timestamp; d date;
BEGIN
  SELECT * INTO e FROM public.establishments WHERE id = public.current_establishment_id();
  IF e.id IS NULL THEN RETURN NULL; END IF;
  local_now := now() AT TIME ZONE e.timezone;
  d := local_now::date;
  IF local_now::time < e.day_start_time THEN d := d - 1; END IF;
  RETURN (d + e.day_start_time) AT TIME ZONE e.timezone;
END;
$$;
REVOKE ALL ON FUNCTION public.op_current_day_start() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.op_current_day_start() TO authenticated, service_role;

-- Auditoria passa a incluir papel do autor e quarto
CREATE OR REPLACE FUNCTION public.op_audit(_est uuid, _action text, _entity text, _entity_id uuid, _meta jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE papel text; quarto text;
BEGIN
  SELECT role::text INTO papel FROM public.user_roles
  WHERE user_id = auth.uid() AND establishment_id = _est
  ORDER BY CASE role WHEN 'proprietario' THEN 0 WHEN 'administrador' THEN 1 ELSE 2 END LIMIT 1;
  IF _entity = 'stays' THEN
    SELECT r.name INTO quarto FROM public.stays s JOIN public.rooms r ON r.id = s.room_id WHERE s.id = _entity_id;
  ELSIF _entity = 'payments' THEN
    SELECT r.name INTO quarto FROM public.payments p JOIN public.stays s ON s.id = p.stay_id
      JOIN public.rooms r ON r.id = s.room_id WHERE p.id = _entity_id;
  ELSIF _entity = 'rooms' THEN
    SELECT name INTO quarto FROM public.rooms WHERE id = _entity_id;
  END IF;
  INSERT INTO public.audit_logs (establishment_id, actor_id, action, entity, entity_id, metadata)
  VALUES (_est, auth.uid(), _action, _entity, _entity_id::text,
    coalesce(_meta, '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object('papel', papel, 'quarto_nome', quarto)));
END;
$$;
REVOKE ALL ON FUNCTION public.op_audit(uuid, text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- Estender por minutos, com verificação de concorrência
CREATE OR REPLACE FUNCTION public.op_extend_stay(
  _stay_id uuid, _minutes integer, _expected_checkout_at timestamptz,
  _amount integer, _pay_now boolean, _method public.payment_method)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid; manager boolean; s public.stays; block integer; suggested integer; new_end timestamptz;
BEGIN
  est := public.op_member_establishment();
  manager := public.is_manager(auth.uid(), est);
  IF _minutes IS NULL OR _minutes < 15 OR _minutes > 1440 THEN RAISE EXCEPTION 'Duração de extensão inválida.'; END IF;

  SELECT * INTO s FROM public.stays WHERE id = _stay_id AND establishment_id = est FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Hospedagem não encontrada.'; END IF;
  IF s.status <> 'em_curso' THEN RAISE EXCEPTION 'Esta hospedagem já foi encerrada e não pode ser estendida.'; END IF;
  IF s.mode <> 'horas' THEN RAISE EXCEPTION 'Só hospedagens por horas podem ser estendidas aqui.'; END IF;
  IF _expected_checkout_at IS NULL OR abs(extract(epoch FROM (s.expected_checkout_at - _expected_checkout_at))) > 1 THEN
    RAISE EXCEPTION 'A hospedagem foi alterada por outro utilizador. Atualize e tente de novo.';
  END IF;

  SELECT rt.hourly_block_minutes INTO block FROM public.rooms r JOIN public.room_types rt ON rt.id = r.room_type_id
  WHERE r.id = s.room_id;
  suggested := ceil(s.agreed_amount::numeric * _minutes / greatest(block, 1))::integer;

  IF _amount IS NULL OR _amount < 0 THEN RAISE EXCEPTION 'Valor inválido.'; END IF;
  IF NOT manager THEN
    IF _amount <> suggested OR NOT coalesce(_pay_now, false) THEN
      RAISE EXCEPTION 'A extensão exige pagamento total antecipado (% Kz).', suggested;
    END IF;
  END IF;
  IF _amount > 0 AND coalesce(_pay_now, false) AND _method IS NULL THEN
    RAISE EXCEPTION 'Indique o meio de pagamento.';
  END IF;

  new_end := s.expected_checkout_at + make_interval(mins => _minutes);
  UPDATE public.stays SET expected_checkout_at = new_end,
    contracted_minutes = coalesce(contracted_minutes, 0) + _minutes,
    expected_amount = expected_amount + _amount
  WHERE id = s.id;

  IF _amount > 0 AND coalesce(_pay_now, false) THEN
    INSERT INTO public.payments (establishment_id, stay_id, amount_kz, method, received_by, note)
    VALUES (est, s.id, _amount, _method, auth.uid(), 'Extensão +' || _minutes || ' min');
  END IF;

  PERFORM public.op_audit(est, 'estadia.prolongada', 'stays', s.id, jsonb_build_object(
    'minutos', _minutes,
    'termino', jsonb_build_object('de', s.expected_checkout_at, 'para', new_end),
    'total', jsonb_build_object('de', s.expected_amount, 'para', s.expected_amount + _amount),
    'valor', _amount, 'pago_agora', (_amount > 0 AND coalesce(_pay_now, false))));
  RETURN new_end;
END;
$$;
REVOKE ALL ON FUNCTION public.op_extend_stay(uuid, integer, timestamptz, integer, boolean, public.payment_method) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.op_extend_stay(uuid, integer, timestamptz, integer, boolean, public.payment_method) TO authenticated, service_role;

-- Saída: guarda tempo excedido; nunca há libertação automática
CREATE OR REPLACE FUNCTION public.op_finish_stay(_stay_id uuid, _allow_debt boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid; s public.stays; paid integer; owed integer; over integer;
BEGIN
  est := public.op_member_establishment();
  SELECT * INTO s FROM public.stays WHERE id = _stay_id AND establishment_id = est FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Hospedagem não encontrada.'; END IF;
  IF s.status <> 'em_curso' THEN RAISE EXCEPTION 'Esta hospedagem já foi encerrada.'; END IF;
  SELECT coalesce(sum(amount_kz), 0) INTO paid FROM public.payments WHERE stay_id = s.id AND status = 'ativo';
  owed := s.expected_amount - paid;
  IF owed > 0 THEN
    IF NOT coalesce(_allow_debt, false) THEN
      RAISE EXCEPTION 'Existe valor em falta (% Kz). Receba antes de registar a saída.', owed;
    END IF;
    IF NOT public.is_manager(auth.uid(), est) THEN
      RAISE EXCEPTION 'Apenas o Proprietário ou Administrador pode fechar com dívida.';
    END IF;
  END IF;
  over := greatest(0, ceil(extract(epoch FROM (now() - s.expected_checkout_at)) / 60)::integer);
  UPDATE public.stays SET status = 'concluida', actual_checkout_at = now(), closed_by = auth.uid(),
    closed_with_debt = (owed > 0), overtime_minutes = over
  WHERE id = s.id;
  UPDATE public.rooms SET status = 'limpeza' WHERE id = s.room_id;
  PERFORM public.op_audit(est, 'estadia.saida', 'stays', s.id, jsonb_build_object(
    'total', s.expected_amount, 'pago', paid, 'em_falta', greatest(owed, 0),
    'termino_previsto', s.expected_checkout_at, 'minutos_excedidos', over));
END;
$$;

-- Atualização em tempo real (respeita RLS)
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms, public.stays, public.payments;
