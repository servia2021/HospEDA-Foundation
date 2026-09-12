# HOSPEDA — Auditoria da Fundação e plano da Etapa 2 (Operação real)

## 1. Auditoria: o que está sólido

- Acesso e sessão: registo, login, terminar sessão, porta de entrada nas páginas privadas. Funciona.
- Isolamento por estabelecimento: validado com dois utilizadores reais; ninguém lê nem escreve dados de outro estabelecimento.
- Papéis (Proprietário, Administrador, Recepcionista) e matriz de permissões já usada na navegação.
- Navegação: menu lateral no computador, barra inferior no telemóvel, com gaveta "Mais". Boa base mobile.
- Registo de auditoria estrutural pronto (tabela + função de registo).
- Identidade visual coerente, em português de Portugal, valores em Kz.

## 2. O que corrigir ANTES de criar dados de negócio

Estes pontos são pequenos, mas se ficarem para depois obrigam a mexer em dados já criados:

1. **Editar dados do estabelecimento** — hoje só se vê; a edição está prometida "na fase seguinte". Entra agora (nome, telefone, cidade, endereço) porque a hospedaria vai querer acertar isto no primeiro dia.
2. **Equipa** — não existe forma de acrescentar a recepcionista. Sem isto, a hospedaria só tem um utilizador e o plano de papéis não se prova. Entra agora, na versão simples: o proprietário cria/atribui acesso e papel; sem painel complexo de permissões.
3. **Sem estabelecimento = sem operação** — quem entra sem estabelecimento deve ser levado ao registo inicial, não a um painel vazio.
4. **Fuso horário e "dia de operação"** — guardar o fuso do estabelecimento e a hora a partir da qual conta um novo dia. Sem isto, "check-ins de hoje" e "caixa do dia" ficam errados mais tarde.
5. **Auditoria automática** — hoje o registo é manual em cada ação. Passa a ser gravado pela própria base de dados nas entradas, saídas e pagamentos, para não haver esquecimentos.

## 3. Decisão de arquitetura: Hospedagem primeiro, Reservas depois

Recomendação: **sim, núcleo = Quartos + Hóspedes + Estadias + Entrada/Saída + Pagamentos. Reservas ficam para a etapa seguinte.**

Porquê: numa hospedaria de ~21 quartos em Angola, a esmagadora maioria das entradas é hóspede que chega à porta. Reservas antecipadas acrescentam disponibilidade futura, confirmações, no-shows e cancelamentos — muito trabalho para pouco valor no primeiro cliente. E o modelo de dados que proponho já deixa reservas encaixáveis depois sem refazer nada (a estadia nasce com um estado inicial).

Curta duração (motéis) sem complicar: a estadia tem um **modo** — "por noite" ou "por período de horas". Só muda a forma de calcular o valor e a hora de saída prevista; o resto do fluxo é idêntico. Nada de tabelas separadas.

## 4. Modelo de dados recomendado

Tudo com o mesmo isolamento por estabelecimento e as mesmas regras de acesso já provadas.

- **Tipos de quarto**: nome, capacidade, preço por noite, preço por período curto (opcional), duração do período.
- **Quartos**: número/nome, tipo, andar/bloco, estado (livre, ocupado, limpeza, manutenção), ativo.
- **Hóspedes**: nome, telefone, documento (tipo + número), nacionalidade, notas. Ligados ao estabelecimento (o hóspede não é partilhado entre hospedarias).
- **Estadias**: quarto, hóspede principal, nº de acompanhantes, modo (noite/período), entrada prevista e real, saída prevista e real, preço acordado, total, estado (aberta, em curso, fechada, cancelada), quem registou.
- **Pagamentos**: estadia, valor, meio (dinheiro, transferência, multicaixa/TPA, outro), data, quem recebeu, nota. Vários por estadia (pagamentos parciais).
- **Auditoria**: já existe; passa a receber automaticamente entrada, saída, pagamento, mudança de estado de quarto.

Consumos e caixa por turno **não** entram agora — mas o pagamento já fica modelado de forma a alimentar o caixa depois.

## 5. Fluxo da recepcionista (poucos toques)

```text
Quartos (grelha por estado)
   -> toca num quarto livre
      -> "Registar entrada"
         -> hóspede: pesquisa por telefone/nome OU cria em 4 campos
         -> modo (noite / período) + preço sugerido pelo tipo de quarto
         -> confirma  =>  quarto fica OCUPADO, estadia EM CURSO
   -> toca num quarto ocupado
      -> vê estadia, valor total, pago e em falta
      -> "Receber" (valor + meio de pagamento)
      -> "Registar saída"  =>  quarto vai para LIMPEZA, estadia FECHADA
   -> quarto em limpeza -> "Pronto" -> LIVRE
```

Alvo: entrada completa em 3 ecrãs, pagamento em 2 toques.

## 6. Dashboard com controlo real

Máximo 3 blocos, sem gráficos:

1. **Agora**: ocupação (%), livres, ocupados, a sair hoje.
2. **Dinheiro de hoje**: faturado, recebido, em falta.
3. **Atenção**: estadias que já passaram a hora de saída, quartos em limpeza há muito tempo, estadias com valor em falta.

Sem números inventados: enquanto não houver quartos, o painel convida a criar os quartos.

## 7. Permissões

| Ação | Proprietário | Administrador | Recepcionista |
|---|---|---|---|
| Ver painel, quartos, estadias | sim | sim | sim |
| Registar entrada, saída, pagamento | sim | sim | sim |
| Criar/editar hóspedes | sim | sim | sim |
| Criar/editar quartos e tipos, definir preços | sim | sim | não |
| Alterar preço fora da tabela numa estadia | sim | sim | não (pede autorização) |
| Cancelar estadia / anular pagamento | sim | sim | não |
| Ver relatórios e histórico de dinheiro | sim | sim | só o próprio turno |
| Gerir equipa e papéis | sim | sim | não |
| Editar dados do estabelecimento | sim | sim | não |
| Ver auditoria | sim | sim | não |

## 8. Regras de negócio a fixar agora

- **Estado do quarto** é consequência da estadia, nunca editado à mão em contradição: entrada -> ocupado; saída -> limpeza; "pronto" -> livre. Manutenção é manual e bloqueia entradas.
- **Sem sobreposição**: um quarto não pode ter duas estadias em curso. Garantido pela base de dados, não só pelo ecrã.
- **Preço**: o tipo de quarto sugere; a estadia guarda o valor acordado. Alterar a tabela de preços nunca muda estadias antigas.
- **Total**: noites (ou períodos) x valor acordado. Saída antecipada recalcula; a diferença fica visível.
- **Pagamentos parciais** são a norma: cada estadia mostra total, pago e em falta. Nunca se apaga um pagamento — anula-se com registo de quem anulou.
- **Cancelamento** só antes da entrada real; depois é saída.
- **Saída** exige decisão explícita quando há valor em falta (fechar com dívida registada ou receber primeiro).
- **Nada é apagado**: cancelar/anular em vez de eliminar, para a auditoria fazer sentido.

## 9. O que NÃO construir nesta etapa

Reservas e calendário futuro; consumos e stock; caixa por turno com abertura/fecho; relatórios avançados e exportações; faturação fiscal; câmaras e integrações; funcionamento sem internet; múltiplos estabelecimentos por utilizador; notificações automáticas.

## 10. Sequência de implementação (passos pequenos, com validação)

1. **Acertos da fundação** — editar estabelecimento, fuso/dia de operação, encaminhamento de quem não tem estabelecimento. *Validar: proprietário altera dados e vê o resultado.*
2. **Equipa** — acrescentar utilizador com papel; recepcionista entra e vê apenas o que lhe compete. *Validar com duas sessões.*
3. **Base de dados da operação** — tipos de quarto, quartos, hóspedes, estadias, pagamentos, com isolamento, permissões e auditoria automática. *Validar: um estabelecimento não vê os quartos do outro.*
4. **Quartos** — criar tipos e quartos, grelha por estado. *Validar: 21 quartos criados e visíveis no telemóvel.*
5. **Entrada** — hóspede + estadia num fluxo curto; quarto passa a ocupado. *Validar tempo real de execução no telemóvel.*
6. **Pagamentos** — receber valores, ver pago/em falta. *Validar somas e pagamentos parciais.*
7. **Saída e limpeza** — fechar estadia, recalcular, libertar quarto. *Validar caso com dívida e caso com saída antecipada.*
8. **Dashboard vivo** — três blocos com dados reais. *Validar contra os dados criados nos passos anteriores.*
9. **Ensaio completo** — simular um dia da hospedaria (várias entradas, pagamentos, saídas) e revisão de segurança/isolamento antes de mostrar ao cliente.

## Notas técnicas

- Cada tabela nova em `public`: criar, dar acessos aos papéis, ligar segurança por linha e políticas com `current_establishment_id()` / `is_manager()` — mesmo padrão já validado.
- Estado do quarto e não-sobreposição garantidos por índice único parcial (uma estadia em curso por quarto) e gatilhos, não por lógica de ecrã.
- Escritas passam por funções de servidor com `requireSupabaseAuth` (padrão de `src/lib/session.functions.ts`); leituras iniciais pelo carregador da rota com React Query.
- Auditoria migra de chamada manual para gatilhos nas tabelas de estadias e pagamentos.
- Valores monetários em inteiros de Kz (sem casas decimais), como já faz `formatMoney`.
- Rotas novas dentro de `_authenticated`: `/hospedagem` (grelha), `/hospedagem/quartos`, `/hospedagem/estadias/$id`; substituem os placeholders atuais.
