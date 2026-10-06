-- Saída por horas liberta o quarto de imediato; por noite mantém passagem por limpeza.
CREATE OR REPLACE FUNCTION public.op_finish_stay(_stay_id uuid, _allow_debt boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE est uuid; s public.stays; paid integer; owed integer; over integer; new_room public.room_status; old_room public.room_status;
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
  new_room := CASE WHEN s.mode = 'horas' THEN 'livre'::public.room_status ELSE 'limpeza'::public.room_status END;
  SELECT status INTO old_room FROM public.rooms WHERE id = s.room_id FOR UPDATE;
  UPDATE public.stays SET status = 'concluida', actual_checkout_at = now(), closed_by = auth.uid(),
    closed_with_debt = (owed > 0), overtime_minutes = over
  WHERE id = s.id;
  UPDATE public.rooms SET status = new_room WHERE id = s.room_id;
  PERFORM public.op_audit(est, 'estadia.saida', 'stays', s.id, jsonb_build_object(
    'modo', s.mode,
    'estado', jsonb_build_object('de', 'em_curso', 'para', 'concluida'),
    'quarto_estado', jsonb_build_object('de', old_room, 'para', new_room),
    'total', s.expected_amount, 'pago', paid, 'em_falta', greatest(owed, 0),
    'termino_previsto', s.expected_checkout_at, 'saida_real', now(), 'minutos_excedidos', over));
END;
$$;
