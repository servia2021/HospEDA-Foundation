-- ===== Base da operação: tipos de quarto, quartos, hóspedes, estadias, pagamentos =====

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS checkout_time time without time zone NOT NULL DEFAULT '12:00';

CREATE TYPE public.room_status AS ENUM ('livre', 'ocupado', 'limpeza', 'manutencao');
CREATE TYPE public.stay_mode AS ENUM ('noite', 'horas');
CREATE TYPE public.stay_status AS ENUM ('em_curso', 'concluida', 'cancelada');
CREATE TYPE public.payment_method AS ENUM ('dinheiro', 'tpa_transferencia', 'outro');
CREATE TYPE public.payment_status AS ENUM ('ativo', 'anulado');

-- Tipos de quarto
CREATE TABLE public.room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  description text CHECK (description IS NULL OR length(description) <= 300),
  nightly_price_kz integer NOT NULL CHECK (nightly_price_kz > 0),
  hourly_price_kz integer CHECK (hourly_price_kz IS NULL OR hourly_price_kz > 0),
  hourly_block_minutes integer NOT NULL DEFAULT 180 CHECK (hourly_block_minutes BETWEEN 30 AND 1440),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, establishment_id)
);
CREATE UNIQUE INDEX room_types_name_uq ON public.room_types (establishment_id, lower(btrim(name)));

-- Quartos
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 40),
  status public.room_status NOT NULL DEFAULT 'livre',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, establishment_id),
  FOREIGN KEY (room_type_id, establishment_id) REFERENCES public.room_types(id, establishment_id)
);
CREATE UNIQUE INDEX rooms_name_uq ON public.rooms (establishment_id, lower(btrim(name)));

-- Hóspedes
CREATE TABLE public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (length(btrim(full_name)) BETWEEN 1 AND 120),
  phone text CHECK (phone IS NULL OR length(phone) <= 30),
  document_ref text CHECK (document_ref IS NULL OR length(document_ref) <= 60),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, establishment_id)
);
CREATE INDEX guests_phone_idx ON public.guests (establishment_id, phone);

-- Estadias
CREATE TABLE public.stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  room_id uuid NOT NULL,
  guest_id uuid NOT NULL,
  mode public.stay_mode NOT NULL,
  units integer NOT NULL CHECK (units > 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  expected_checkout_at timestamptz NOT NULL,
  actual_checkout_at timestamptz,
  status public.stay_status NOT NULL DEFAULT 'em_curso',
  agreed_amount integer NOT NULL CHECK (agreed_amount > 0),
  expected_amount integer NOT NULL CHECK (expected_amount > 0),
  closed_with_debt boolean NOT NULL DEFAULT false,
  cancel_reason text,
  created_by uuid NOT NULL,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, establishment_id),
  CHECK (expected_checkout_at > started_at),
  FOREIGN KEY (room_id, establishment_id) REFERENCES public.rooms(id, establishment_id),
  FOREIGN KEY (guest_id, establishment_id) REFERENCES public.guests(id, establishment_id)
);
CREATE UNIQUE INDEX stays_one_active_per_room_uq ON public.stays (room_id) WHERE status = 'em_curso';
CREATE INDEX stays_est_status_idx ON public.stays (establishment_id, status, expected_checkout_at);

-- Pagamentos
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  stay_id uuid NOT NULL,
  amount_kz integer NOT NULL CHECK (amount_kz > 0),
  method public.payment_method NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'ativo',
  note text CHECK (note IS NULL OR length(note) <= 200),
  paid_at timestamptz NOT NULL DEFAULT now(),
  received_by uuid NOT NULL,
  voided_at timestamptz,
  voided_by uuid,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (stay_id, establishment_id) REFERENCES public.stays(id, establishment_id),
  CHECK (
    (status = 'ativo' AND voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL)
    OR (status = 'anulado' AND voided_at IS NOT NULL AND voided_by IS NOT NULL
        AND length(btrim(coalesce(void_reason, ''))) >= 3)
  )
);
CREATE INDEX payments_stay_idx ON public.payments (stay_id);
CREATE INDEX payments_est_paid_idx ON public.payments (establishment_id, paid_at);

-- Acesso: leitura para membros; escrita apenas pelas funções de operação abaixo.
GRANT SELECT ON public.room_types, public.rooms, public.guests, public.stays, public.payments TO authenticated;
GRANT ALL ON public.room_types, public.rooms, public.guests, public.stays, public.payments TO service_role;

ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY room_types_select_members ON public.room_types FOR SELECT TO authenticated
  USING (establishment_id = public.current_establishment_id());
CREATE POLICY rooms_select_members ON public.rooms FOR SELECT TO authenticated
  USING (establishment_id = public.current_establishment_id());
CREATE POLICY guests_select_members ON public.guests FOR SELECT TO authenticated
  USING (establishment_id = public.current_establishment_id());
CREATE POLICY stays_select_members ON public.stays FOR SELECT TO authenticated
  USING (establishment_id = public.current_establishment_id());
CREATE POLICY payments_select_members ON public.payments FOR SELECT TO authenticated
  USING (establishment_id = public.current_establishment_id());

CREATE TRIGGER trg_room_types_updated_at BEFORE UPDATE ON public.room_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_guests_updated_at BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_stays_updated_at BEFORE UPDATE ON public.stays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pagamentos nunca são apagados.
CREATE OR REPLACE FUNCTION public.prevent_payment_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  RAISE EXCEPTION 'Pagamentos não podem ser apagados; use a anulação.';
END;
$$;
CREATE TRIGGER trg_payments_no_delete BEFORE DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_payment_delete();

-- ===== Auxiliares =====
CREATE OR REPLACE FUNCTION public.op_member_establishment()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
  SELECT establishment_id INTO est FROM public.profiles WHERE id = auth.uid();
  IF est IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND establishment_id = est
  ) THEN
    RAISE EXCEPTION 'Sem acesso a um estabelecimento.';
  END IF;
  RETURN est;
END;
$$;

CREATE OR REPLACE FUNCTION public.op_manager_establishment()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid;
BEGIN
  est := public.op_member_establishment();
  IF NOT public.is_manager(auth.uid(), est) THEN
    RAISE EXCEPTION 'Apenas o Proprietário ou Administrador pode fazer esta operação.';
  END IF;
  RETURN est;
END;
$$;

CREATE OR REPLACE FUNCTION public.op_audit(_est uuid, _action text, _entity text, _entity_id uuid, _meta jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  INSERT INTO public.audit_logs (establishment_id, actor_id, action, entity, entity_id, metadata)
  VALUES (_est, auth.uid(), _action, _entity, _entity_id::text, coalesce(_meta, '{}'::jsonb));
$$;

CREATE OR REPLACE FUNCTION public.stay_paid_kz(_stay_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(sum(p.amount_kz), 0)::integer
  FROM public.payments p
  JOIN public.stays s ON s.id = p.stay_id
  WHERE p.stay_id = _stay_id AND p.status = 'ativo'
    AND s.establishment_id = public.current_establishment_id();
$$;

-- ===== Tipos de quarto e quartos (gestores) =====
CREATE OR REPLACE FUNCTION public.op_upsert_room_type(
  _id uuid, _name text, _description text, _nightly_price_kz integer,
  _hourly_price_kz integer, _hourly_block_minutes integer, _active boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid; old public.room_types; rid uuid;
BEGIN
  est := public.op_manager_establishment();
  IF _id IS NULL THEN
    INSERT INTO public.room_types (establishment_id, name, description, nightly_price_kz,
      hourly_price_kz, hourly_block_minutes, active)
    VALUES (est, btrim(_name), nullif(btrim(coalesce(_description, '')), ''), _nightly_price_kz,
      _hourly_price_kz, coalesce(_hourly_block_minutes, 180), coalesce(_active, true))
    RETURNING id INTO rid;
    PERFORM public.op_audit(est, 'quartos.tipo_criado', 'room_types', rid,
      jsonb_build_object('nome', btrim(_name), 'preco_noite', _nightly_price_kz, 'preco_horas', _hourly_price_kz));
    RETURN rid;
  END IF;

  SELECT * INTO old FROM public.room_types WHERE id = _id AND establishment_id = est FOR UPDATE;
  IF old.id IS NULL THEN RAISE EXCEPTION 'Tipo de quarto não encontrado.'; END IF;
  UPDATE public.room_types SET
    name = btrim(_name),
    description = nullif(btrim(coalesce(_description, '')), ''),
    nightly_price_kz = _nightly_price_kz,
    hourly_price_kz = _hourly_price_kz,
    hourly_block_minutes = coalesce(_hourly_block_minutes, old.hourly_block_minutes),
    active = coalesce(_active, old.active)
  WHERE id = _id;
  PERFORM public.op_audit(est, 'quartos.tipo_alterado', 'room_types', _id, jsonb_build_object(
    'preco_noite', jsonb_build_object('de', old.nightly_price_kz, 'para', _nightly_price_kz),
    'preco_horas', jsonb_build_object('de', old.hourly_price_kz, 'para', _hourly_price_kz),
    'nome', jsonb_build_object('de', old.name, 'para', btrim(_name))));
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.op_upsert_room(_id uuid, _room_type_id uuid, _name text, _active boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid; old public.rooms; rid uuid;
BEGIN
  est := public.op_manager_establishment();
  IF NOT EXISTS (SELECT 1 FROM public.room_types WHERE id = _room_type_id AND establishment_id = est) THEN
    RAISE EXCEPTION 'Tipo de quarto não encontrado.';
  END IF;
  IF _id IS NULL THEN
    INSERT INTO public.rooms (establishment_id, room_type_id, name, active)
    VALUES (est, _room_type_id, btrim(_name), coalesce(_active, true))
    RETURNING id INTO rid;
    PERFORM public.op_audit(est, 'quartos.quarto_criado', 'rooms', rid, jsonb_build_object('nome', btrim(_name)));
    RETURN rid;
  END IF;

  SELECT * INTO old FROM public.rooms WHERE id = _id AND establishment_id = est FOR UPDATE;
  IF old.id IS NULL THEN RAISE EXCEPTION 'Quarto não encontrado.'; END IF;
  IF coalesce(_active, old.active) = false AND old.status = 'ocupado' THEN
    RAISE EXCEPTION 'Não pode desativar um quarto ocupado.';
  END IF;
  UPDATE public.rooms SET room_type_id = _room_type_id, name = btrim(_name),
    active = coalesce(_active, old.active)
  WHERE id = _id;
  PERFORM public.op_audit(est, 'quartos.quarto_alterado', 'rooms', _id, jsonb_build_object(
    'nome', jsonb_build_object('de', old.name, 'para', btrim(_name)),
    'tipo', jsonb_build_object('de', old.room_type_id, 'para', _room_type_id),
    'ativo', jsonb_build_object('de', old.active, 'para', coalesce(_active, old.active))));
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.op_set_room_maintenance(_room_id uuid, _on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid; r public.rooms;
BEGIN
  est := public.op_manager_establishment();
  SELECT * INTO r FROM public.rooms WHERE id = _room_id AND establishment_id = est FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Quarto não encontrado.'; END IF;
  IF _on THEN
    IF r.status = 'ocupado' THEN RAISE EXCEPTION 'O quarto está ocupado.'; END IF;
    UPDATE public.rooms SET status = 'manutencao' WHERE id = _room_id;
  ELSE
    IF r.status <> 'manutencao' THEN RAISE EXCEPTION 'O quarto não está em manutenção.'; END IF;
    UPDATE public.rooms SET status = 'livre' WHERE id = _room_id;
  END IF;
  PERFORM public.op_audit(est, CASE WHEN _on THEN 'quartos.manutencao_inicio' ELSE 'quartos.manutencao_fim' END,
    'rooms', _room_id, jsonb_build_object('de', r.status));
END;
$$;

CREATE OR REPLACE FUNCTION public.op_mark_room_ready(_room_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid; r public.rooms;
BEGIN
  est := public.op_member_establishment();
  SELECT * INTO r FROM public.rooms WHERE id = _room_id AND establishment_id = est FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Quarto não encontrado.'; END IF;
  IF r.status <> 'limpeza' THEN RAISE EXCEPTION 'O quarto não está em limpeza.'; END IF;
  UPDATE public.rooms SET status = 'livre' WHERE id = _room_id;
  PERFORM public.op_audit(est, 'quartos.limpeza_concluida', 'rooms', _room_id, '{}'::jsonb);
END;
$$;

-- ===== Hóspedes =====
CREATE OR REPLACE FUNCTION public.op_create_guest(_full_name text, _phone text, _document_ref text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid; gid uuid;
BEGIN
  est := public.op_member_establishment();
  INSERT INTO public.guests (establishment_id, full_name, phone, document_ref, created_by)
  VALUES (est, btrim(_full_name), nullif(btrim(coalesce(_phone, '')), ''),
          nullif(btrim(coalesce(_document_ref, '')), ''), auth.uid())
  RETURNING id INTO gid;
  RETURN gid;
END;
$$;

-- ===== Estadias =====
CREATE OR REPLACE FUNCTION public.op_start_stay(
  _room_id uuid, _guest_id uuid, _mode public.stay_mode, _units integer,
  _agreed_amount integer, _payment_amount integer, _payment_method public.payment_method)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  est uuid; manager boolean; r public.rooms; rt public.room_types; e public.establishments;
  suggested integer; total integer; checkout timestamptz; local_now timestamp; base_date date;
  sid uuid;
BEGIN
  est := public.op_member_establishment();
  manager := public.is_manager(auth.uid(), est);
  IF _units IS NULL OR _units < 1 OR _units > 365 THEN RAISE EXCEPTION 'Duração inválida.'; END IF;

  SELECT * INTO r FROM public.rooms WHERE id = _room_id AND establishment_id = est FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Quarto não encontrado.'; END IF;
  IF NOT r.active THEN RAISE EXCEPTION 'Quarto inativo.'; END IF;
  IF r.status = 'manutencao' THEN RAISE EXCEPTION 'Quarto em manutenção: entrada bloqueada.'; END IF;
  IF r.status <> 'livre' THEN RAISE EXCEPTION 'O quarto não está livre.'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.guests WHERE id = _guest_id AND establishment_id = est) THEN
    RAISE EXCEPTION 'Hóspede não encontrado.';
  END IF;

  SELECT * INTO rt FROM public.room_types WHERE id = r.room_type_id;
  SELECT * INTO e FROM public.establishments WHERE id = est;
  suggested := CASE WHEN _mode = 'noite' THEN rt.nightly_price_kz ELSE rt.hourly_price_kz END;

  IF _agreed_amount IS NULL OR _agreed_amount <= 0 THEN RAISE EXCEPTION 'Valor acordado inválido.'; END IF;
  IF NOT manager AND (suggested IS NULL OR _agreed_amount <> suggested) THEN
    RAISE EXCEPTION 'Apenas o Proprietário ou Administrador pode alterar o preço da tabela.';
  END IF;

  total := _agreed_amount * _units;

  IF _mode = 'horas' THEN
    IF coalesce(_payment_amount, 0) <> total THEN
      RAISE EXCEPTION 'Estadia por horas exige pagamento total na entrada (% Kz).', total;
    END IF;
    checkout := now() + make_interval(mins => rt.hourly_block_minutes * _units);
  ELSE
    IF _payment_amount IS NOT NULL AND (_payment_amount <= 0 OR _payment_amount > total) THEN
      RAISE EXCEPTION 'Valor de pagamento inválido.';
    END IF;
    local_now := now() AT TIME ZONE e.timezone;
    base_date := local_now::date;
    IF local_now::time < e.day_start_time THEN base_date := base_date - 1; END IF;
    checkout := ((base_date + _units) + e.checkout_time) AT TIME ZONE e.timezone;
  END IF;

  IF _payment_amount IS NOT NULL AND _payment_method IS NULL THEN
    RAISE EXCEPTION 'Indique o meio de pagamento.';
  END IF;

  INSERT INTO public.stays (establishment_id, room_id, guest_id, mode, units, expected_checkout_at,
    agreed_amount, expected_amount, created_by)
  VALUES (est, _room_id, _guest_id, _mode, _units, checkout, _agreed_amount, total, auth.uid())
  RETURNING id INTO sid;

  IF _payment_amount IS NOT NULL THEN
    INSERT INTO public.payments (establishment_id, stay_id, amount_kz, method, received_by)
    VALUES (est, sid, _payment_amount, _payment_method, auth.uid());
  END IF;

  UPDATE public.rooms SET status = 'ocupado' WHERE id = _room_id;

  PERFORM public.op_audit(est, 'estadia.entrada', 'stays', sid, jsonb_build_object(
    'quarto', r.name, 'modo', _mode, 'unidades', _units, 'valor_acordado', _agreed_amount,
    'preco_tabela', suggested, 'total', total, 'pago_na_entrada', coalesce(_payment_amount, 0)));
  RETURN sid;
END;
$$;

CREATE OR REPLACE FUNCTION public.op_extend_hourly_stay(
  _stay_id uuid, _units integer, _payment_amount integer, _payment_method public.payment_method)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid; s public.stays; rt public.room_types; extra integer;
BEGIN
  est := public.op_member_establishment();
  SELECT * INTO s FROM public.stays WHERE id = _stay_id AND establishment_id = est FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Estadia não encontrada.'; END IF;
  IF s.status <> 'em_curso' OR s.mode <> 'horas' THEN RAISE EXCEPTION 'Só estadias por horas em curso podem ser prolongadas.'; END IF;
  IF _units IS NULL OR _units < 1 OR _units > 24 THEN RAISE EXCEPTION 'Duração inválida.'; END IF;
  IF _payment_method IS NULL THEN RAISE EXCEPTION 'Indique o meio de pagamento.'; END IF;
  extra := s.agreed_amount * _units;
  IF coalesce(_payment_amount, 0) <> extra THEN
    RAISE EXCEPTION 'Prolongar exige pagamento total antecipado (% Kz).', extra;
  END IF;
  SELECT rt2.* INTO rt FROM public.rooms ro JOIN public.room_types rt2 ON rt2.id = ro.room_type_id WHERE ro.id = s.room_id;
  INSERT INTO public.payments (establishment_id, stay_id, amount_kz, method, received_by, note)
  VALUES (est, s.id, extra, _payment_method, auth.uid(), 'Prolongamento');
  UPDATE public.stays SET units = units + _units, expected_amount = expected_amount + extra,
    expected_checkout_at = expected_checkout_at + make_interval(mins => rt.hourly_block_minutes * _units)
  WHERE id = s.id;
  PERFORM public.op_audit(est, 'estadia.prolongada', 'stays', s.id,
    jsonb_build_object('unidades', _units, 'valor', extra));
END;
$$;

CREATE OR REPLACE FUNCTION public.op_add_payment(
  _stay_id uuid, _amount integer, _method public.payment_method, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid; s public.stays; paid integer; pid uuid;
BEGIN
  est := public.op_member_establishment();
  SELECT * INTO s FROM public.stays WHERE id = _stay_id AND establishment_id = est FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Estadia não encontrada.'; END IF;
  IF s.status = 'cancelada' THEN RAISE EXCEPTION 'Estadia cancelada.'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido.'; END IF;
  IF _method IS NULL THEN RAISE EXCEPTION 'Indique o meio de pagamento.'; END IF;
  SELECT coalesce(sum(amount_kz), 0) INTO paid FROM public.payments WHERE stay_id = s.id AND status = 'ativo';
  IF paid + _amount > s.expected_amount THEN
    RAISE EXCEPTION 'O valor ultrapassa o que está em falta (% Kz).', s.expected_amount - paid;
  END IF;
  INSERT INTO public.payments (establishment_id, stay_id, amount_kz, method, received_by, note)
  VALUES (est, s.id, _amount, _method, auth.uid(), nullif(btrim(coalesce(_note, '')), ''))
  RETURNING id INTO pid;
  PERFORM public.op_audit(est, 'pagamento.recebido', 'payments', pid,
    jsonb_build_object('estadia', s.id, 'valor', _amount, 'meio', _method));
  RETURN pid;
END;
$$;

CREATE OR REPLACE FUNCTION public.op_void_payment(_payment_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid; p public.payments;
BEGIN
  est := public.op_manager_establishment();
  IF length(btrim(coalesce(_reason, ''))) < 3 THEN RAISE EXCEPTION 'Indique o motivo da anulação.'; END IF;
  SELECT * INTO p FROM public.payments WHERE id = _payment_id AND establishment_id = est FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Pagamento não encontrado.'; END IF;
  IF p.status = 'anulado' THEN RAISE EXCEPTION 'Pagamento já anulado.'; END IF;
  UPDATE public.payments SET status = 'anulado', voided_at = now(), voided_by = auth.uid(),
    void_reason = btrim(_reason)
  WHERE id = p.id;
  PERFORM public.op_audit(est, 'pagamento.anulado', 'payments', p.id,
    jsonb_build_object('estadia', p.stay_id, 'valor', p.amount_kz, 'motivo', btrim(_reason)));
END;
$$;

CREATE OR REPLACE FUNCTION public.op_finish_stay(_stay_id uuid, _allow_debt boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid; s public.stays; paid integer; owed integer;
BEGIN
  est := public.op_member_establishment();
  SELECT * INTO s FROM public.stays WHERE id = _stay_id AND establishment_id = est FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Estadia não encontrada.'; END IF;
  IF s.status <> 'em_curso' THEN RAISE EXCEPTION 'A estadia não está em curso.'; END IF;
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
  UPDATE public.stays SET status = 'concluida', actual_checkout_at = now(), closed_by = auth.uid(),
    closed_with_debt = (owed > 0)
  WHERE id = s.id;
  UPDATE public.rooms SET status = 'limpeza' WHERE id = s.room_id;
  PERFORM public.op_audit(est, 'estadia.saida', 'stays', s.id,
    jsonb_build_object('total', s.expected_amount, 'pago', paid, 'em_falta', greatest(owed, 0)));
END;
$$;

CREATE OR REPLACE FUNCTION public.op_cancel_stay(_stay_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid; s public.stays;
BEGIN
  est := public.op_manager_establishment();
  IF length(btrim(coalesce(_reason, ''))) < 3 THEN RAISE EXCEPTION 'Indique o motivo do cancelamento.'; END IF;
  SELECT * INTO s FROM public.stays WHERE id = _stay_id AND establishment_id = est FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Estadia não encontrada.'; END IF;
  IF s.status <> 'em_curso' THEN RAISE EXCEPTION 'A estadia não está em curso.'; END IF;
  IF EXISTS (SELECT 1 FROM public.payments WHERE stay_id = s.id AND status = 'ativo') THEN
    RAISE EXCEPTION 'Anule primeiro os pagamentos desta estadia.';
  END IF;
  UPDATE public.stays SET status = 'cancelada', cancel_reason = btrim(_reason), closed_by = auth.uid(),
    actual_checkout_at = now()
  WHERE id = s.id;
  UPDATE public.rooms SET status = 'livre' WHERE id = s.room_id;
  PERFORM public.op_audit(est, 'estadia.cancelada', 'stays', s.id, jsonb_build_object('motivo', btrim(_reason)));
END;
$$;

-- Execução: só utilizadores autenticados; auxiliares internos não expostos.
REVOKE ALL ON FUNCTION public.op_member_establishment(), public.op_manager_establishment(),
  public.op_audit(uuid, text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION
  public.stay_paid_kz(uuid),
  public.op_upsert_room_type(uuid, text, text, integer, integer, integer, boolean),
  public.op_upsert_room(uuid, uuid, text, boolean),
  public.op_set_room_maintenance(uuid, boolean),
  public.op_mark_room_ready(uuid),
  public.op_create_guest(text, text, text),
  public.op_start_stay(uuid, uuid, public.stay_mode, integer, integer, integer, public.payment_method),
  public.op_extend_hourly_stay(uuid, integer, integer, public.payment_method),
  public.op_add_payment(uuid, integer, public.payment_method, text),
  public.op_void_payment(uuid, text),
  public.op_finish_stay(uuid, boolean),
  public.op_cancel_stay(uuid, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.stay_paid_kz(uuid),
  public.op_upsert_room_type(uuid, text, text, integer, integer, integer, boolean),
  public.op_upsert_room(uuid, uuid, text, boolean),
  public.op_set_room_maintenance(uuid, boolean),
  public.op_mark_room_ready(uuid),
  public.op_create_guest(text, text, text),
  public.op_start_stay(uuid, uuid, public.stay_mode, integer, integer, integer, public.payment_method),
  public.op_extend_hourly_stay(uuid, integer, integer, public.payment_method),
  public.op_add_payment(uuid, integer, public.payment_method, text),
  public.op_void_payment(uuid, text),
  public.op_finish_stay(uuid, boolean),
  public.op_cancel_stay(uuid, text)
TO authenticated, service_role;
