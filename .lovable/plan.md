# Diagnóstico: Dashboard vs Hospedagem (Emas)

## Causa (confirmada)
O Dashboard não lê nenhum dado. Em `src/routes/_authenticated/dashboard.tsx` todos os indicadores são valores fixos da Fase 1:
- Ocupação `formatPercent(0)`, Disponíveis `"0"`, Check-ins/Check-outs `"0"`, com o texto "Sem quartos registados".
- Receita, Recebido e Pendente `formatMoney(0, ...)`.
- Alertas e "Próximos passos (Fase 1 concluída…)" são texto fixo.
- A página só usa `useAccess()` (nome do estabelecimento e papel). Não chama o backend nem lê quartos, estadias ou pagamentos.

A Hospedagem usa `getOperationsBoard` (`src/lib/operations.functions.ts`), que lê `rooms`, `stays`, `payments`, `guests` com RLS e `op_current_day_start`.

## Os dados estão certos (consulta direta, só leitura)
- Emas (`97382462-…`) tem 1 quarto: "01", estado `ocupado`.
- Estadia `34366efd-…` de Sergio Augusto: por horas, em curso, entrada 08:16 UTC (09:16 Luanda), fim previsto 12:16 UTC (13:16).
- Pagamentos ativos: 14.000 Kz.
- Tudo pertence ao Emas. Não há problema de filtros, estabelecimento, permissões, fuso ou dados de demonstração. A divergência vem só do Dashboard provisório.

## Correção mínima recomendada (precisa de autorização)
Usar no Dashboard a mesma fonte da Hospedagem, sem redesenho nem nova consulta ao backend:
- Ler `getOperationsBoard` (mesma chave de cache da Hospedagem).
- Ocupação = ocupados / quartos ativos; Disponíveis = quartos `livre`; mostrar o número real de quartos.
- Recebido = `receivedTodayKz`; Pendente = soma de (valor previsto − pago) das estadias em curso; Receita = Recebido, até existir Caixa.
- Check-ins hoje = estadias com início desde o início do dia; Check-outs = estadias por sair ou expiradas (o resultado do board não inclui saídas já concluídas hoje, por isso fica assinalado como limitação ou exige um pequeno campo extra).
- Alertas: listar as estadias expiradas ou com valor em falta; senão, manter o estado vazio.
- Retirar o bloco "Fase 1 concluída".
- Só altera `dashboard.tsx`. Base de dados, permissões e outras páginas ficam iguais.

## Validação após a correção
1. Typecheck/build sem erros.
2. Entrar com sessão Emas só de leitura e abrir `/dashboard`: deve mostrar 1 quarto, 100% de ocupação, 0 disponíveis, 14.000 Kz recebidos, 0 Kz pendentes. Os valores devem coincidir com `/hospedagem`.
3. Conta demo: o Dashboard mostra apenas os seus dados (0) e nada do Emas.
4. Nenhum dado é criado ou alterado durante a validação.
