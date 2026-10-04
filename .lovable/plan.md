# HOSPEDA — Auditoria e plano até ao primeiro cliente

## 1. O que está realmente funcional (verificado)

- Registo, login, sessão e páginas privadas protegidas.
- Isolamento entre estabelecimentos (validado com dois utilizadores reais, 14/14).
- Registo inicial do estabelecimento; quem não tem estabelecimento é levado para lá.
- Configurações: Proprietário/Administrador editam nome, telefone, cidade, endereço, fuso horário e hora de início do dia; Recepcionista só vê.
- Histórico automático das alterações ao estabelecimento.
- Navegação: menu lateral no computador, barra inferior no telemóvel.
- Equipa (parte do servidor apenas): tabela de convites, aceitação automática ao criar conta, histórico de convites e papéis, operações de listar/convidar/mudar papel/remover/cancelar.

## 2. O que falta para ser vendável/demonstrável

- **Equipa sem ecrã**: as operações existem mas nenhum ecrã as usa. A Recepcionista não pode ser adicionada pela interface.
- **Hospedagem, Dashboard e Caixa** ainda são páginas de espera ou mostram zeros fixos.
- **Envio de emails de convite** não está configurado; hoje o convite fica pendente e a pessoa entra quando cria conta com esse email.
- **Risco a confirmar primeiro**: o repositório só tem 2 ficheiros de migração, mas a base de dados já tem convites, fuso horário e gatilhos. Antes de criar tabelas novas, confirmar que todas as alterações da base de dados estão guardadas no GitHub (senão um novo ambiente nasceria incompleto).
- Registo com confirmação automática de email está ligado; aceitável para demonstração, decidir antes de produção.

## 3. Módulos mínimos agora

1. **Equipa** (ecrã) — lista, convidar, mudar papel, remover.
2. **Quartos** — tipos com preços e grelha de quartos por estado.
3. **Entrada** — escolher quarto livre, hóspede rápido, modo noite/horas, valor.
4. **Pagamento** — receber valor e meio de pagamento; pago/em falta.
5. **Saída e limpeza** — fechar estadia, quarto vai a limpeza, "Pronto" liberta.
6. **Dashboard vivo** — Agora, Dinheiro de hoje, Atenção.

Nada mais.

## 4. Regras de negócio (fixar já para evitar refazer)

**Estados do quarto** — guardados: Livre, Ocupado, Limpeza, Manutenção. "A sair" **não é guardado**: é calculado (ocupado com saída prevista hoje ou já ultrapassada = "A sair" / "Atrasado"). Assim nunca fica desatualizado.

```text
Livre --entrada--> Ocupado --saída--> Limpeza --pronto--> Livre
Livre <--> Manutenção (manual, só gestores; bloqueia entradas)
```

O estado muda só pelas ações; a base de dados garante uma única estadia em curso por quarto.

**Modos de estadia**
- **Por noite**: saída prevista = data de saída à hora de checkout do estabelecimento (padrão 12:00). Total = noites x preço acordado. Pagamento parcial permitido.
- **Por horas** (curta duração): escolhe-se o nº de períodos (ex.: 3h). Saída prevista = entrada + duração. **Regra explícita: pagamento total obrigatório na entrada** — a entrada não é gravada sem o pagamento completo, numa só operação. Prolongar = novo pagamento antes de estender a hora.

**Preço**: o tipo de quarto sugere o valor; a estadia guarda o valor acordado. Mudar a tabela nunca altera estadias antigas. Só gestores alteram o valor sugerido.

**Pagamentos**: vários por estadia; meios: Dinheiro, Multicaixa/TPA, Transferência, Outro. Nunca se apagam: anula-se com motivo e autor (só gestores). Valores em Kz inteiros.

**Saída**
- Se houver valor em falta: decisão explícita — "Receber agora" ou "Fechar com dívida" (só gestores podem fechar com dívida; recepcionista tem de receber).
- Saída antecipada em estadia por noite: recalcula noites, mostra a diferença; o reembolso é registado como nota, sem fluxo próprio.
- Estadia por horas não recalcula para baixo.

**Limpeza**: após saída, quarto em Limpeza; qualquer papel marca "Pronto". Alerta se em limpeza há mais de 2 horas.

**Cancelamento**: só por gestores e só para entradas registadas por engano (motivo obrigatório); fica no histórico. Nada é apagado.

**Dia de operação**: "hoje" usa o fuso e a hora de início do dia do estabelecimento.

## 5. Permissões exatas

| Ação | Proprietário | Administrador | Recepcionista |
|---|---|---|---|
| Ver Dashboard, quartos, estadias atuais | sim | sim | sim |
| Registar entrada, receber pagamento, registar saída | sim | sim | sim |
| Marcar quarto "Pronto" após limpeza | sim | sim | sim |
| Criar/editar hóspedes | sim | sim | sim |
| Alterar preço sugerido numa entrada | sim | sim | não |
| Pôr/tirar quarto de manutenção | sim | sim | não |
| Criar/editar quartos, tipos e preços | sim | sim | não |
| Fechar saída com dívida | sim | sim | não |
| Anular pagamento / cancelar estadia | sim | sim | não |
| Ver dinheiro do dia (todos) | sim | sim | só o que ela recebeu |
| Editar estabelecimento | sim | sim | não |
| Gerir equipa (Admin/Recepcionista) | sim | sim | não |
| Alterar/remover Proprietário | ninguém por este ecrã | não | não |
| Ver histórico/auditoria | sim | sim | não |

Todas garantidas na base de dados, não só no ecrã.

## 6. Ordem de implementação (cada passo validado)

0. **Verificar a base**: confirmar que todas as alterações da base de dados estão no repositório. *Validar: lista de migrações corresponde ao estado real.*
1. **Ecrã Equipa** nas Configurações. *Validar: gestor convida recepcionista; ela cria conta, entra no estabelecimento certo e não vê Equipa; mudar papel pede confirmação; outro estabelecimento não vê nada.*
2. **Base da operação**: tipos de quarto, quartos, hóspedes, estadias, pagamentos, com isolamento, permissões e histórico automático; regra de uma estadia por quarto; hora de checkout no estabelecimento. *Validar: testes com dois estabelecimentos e com recepcionista a tentar ações proibidas.*
3. **Quartos**: criar tipos e quartos (criação rápida de vários de uma vez), grelha por estado no telemóvel. *Validar: 21 quartos criados em poucos minutos.*
4. **Entrada** (noite e horas), com pagamento obrigatório no modo horas. *Validar: entrada por horas impossível sem pagamento total; quarto passa a Ocupado; 2.ª entrada no mesmo quarto bloqueada.*
5. **Pagamentos** na ficha da estadia. *Validar: somas, parciais, anulação só por gestor.*
6. **Saída e limpeza**. *Validar: saída com dívida, saída antecipada, limpeza -> Livre.*
7. **Dashboard vivo** (3 blocos, dados reais, sem gráficos). *Validar contra os dados dos passos anteriores.*
8. **Ensaio de um dia completo** no telemóvel + revisão de segurança + limpeza dos dados de teste.

## 7. Fica deliberadamente para depois

Reservas e calendário; consumos/bar e stock; caixa por turno com abertura/fecho; relatórios e exportações; faturação fiscal; envio real de emails/SMS; funcionamento sem internet; múltiplos estabelecimentos por utilizador; fotos de documentos; integrações; câmaras; módulos Operação e Relatórios (continuam como "em breve" ou escondidos).

## 8. Critérios de "pronto para primeiro cliente"

- Proprietário regista estabelecimento, cria 21 quartos e convida a recepcionista sem ajuda técnica.
- Recepcionista faz uma entrada por noite em até 3 ecrãs e uma por horas (com pagamento) em menos de 1 minuto no telemóvel.
- É impossível: duas estadias no mesmo quarto; entrada por horas sem pagamento total; recepcionista alterar preços, anular pagamentos ou fechar com dívida.
- Dashboard bate certo com as estadias e pagamentos do ensaio (ocupação, recebido, em falta).
- Cada entrada, pagamento, anulação e saída aparece no histórico com autor e hora.
- Isolamento entre dois estabelecimentos revalidado com os módulos novos.
- Funciona bem em telemóvel com rede fraca (páginas leves, sem imagens pesadas).
- Sem erros de compilação; dados de teste removidos; todas as alterações no GitHub.

## Notas técnicas

- Novas tabelas em `public` com `establishment_id`, GRANTs, RLS via `current_establishment_id()` / `is_manager()`.
- Índice único parcial em `stays(room_id) where status='em_curso'`.
- Entrada + pagamento (modo horas) e saída numa função SQL transacional (`security definer` com verificação de papel), chamada por server function com `requireSupabaseAuth`; estado do quarto atualizado só por essas funções/gatilhos.
- "A sair/Atrasado" calculado na leitura a partir de `expected_checkout_at`.
- `checkout_time` novo em `establishments` (default 12:00).
- Novas permissões em `src/lib/roles.ts` (ex.: `quartos.gerir`, `preco.alterar`, `pagamento.anular`, `saida.com_divida`).
- Rotas: `/hospedagem` (grelha), `/hospedagem/quartos`, `/hospedagem/estadias/$id`.
