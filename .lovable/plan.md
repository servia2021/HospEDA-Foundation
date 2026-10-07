# HOSPEDA — Ensaio final do MVP piloto (hospedagem)

Objetivo: provar, com dados de teste isolados, que quartos, estadias, pagamentos, cronómetro, auditoria e permissões estão aptos para os primeiros pilotos. Sem novas funcionalidades. Correções só se um teste falhar por comportamento realmente errado, e só no âmbito da hospedagem.

## Estado atual (já verificado no código)

- A entrada usa a hora real do servidor. Por horas exige o pagamento total na mesma operação; o fim é a entrada mais a duração do período.
- A extensão soma minutos ao fim atual e recusa pedidos feitos sobre um fim desatualizado. A saída bloqueia a linha da estadia: por horas o quarto fica Livre, por noite vai para Limpeza.
- Não há nenhuma automação que liberte o quarto ou cobre quando o tempo expira.
- Fim por noite: a data do dia operacional (dia anterior se a hora local for antes do "início do dia") + noites, à hora de checkout (12:00).

## Dados de teste isolados

- Um estabelecimento novo "ENSAIO PILOTO (TESTE)" com 3 contas `ensaio.*@teste-hospeda.ao` (Proprietário, Administrador, Recepcionista) e uma conta de fora para isolamento.
- Tipo "Motel TESTE" (5.000 Kz por 120 min; 15.000 Kz por noite), quartos 07 e 08, hóspede "João Manuel (TESTE)".
- O estabelecimento real "Emas" e as contas reais não são tocados nem lidos para escrita.

## Testes (PASS/FAIL com evidência)

1. Entrada Q07 por horas, 120 min, 5.000 Kz, pela Recepcionista.
2. Na base de dados: `started_at` = momento da confirmação, fim = +120 min, pagamento 5.000 Kz ativo, estadia ligada ao Q07, Q07 Ocupado. Para mostrar 22:14 / 00:14, as horas desta estadia de teste são deslocadas para as 22:14 de Luanda, mantendo a duração.
3. Administrador e Proprietário veem a mesma estadia; o cronómetro igual em duas sessões de browser e após refresh.
4. Extensão +1h de 00:14 para 01:14; auditoria com autor, papel, quarto, fim anterior e novo, minutos e hora; `started_at` intacto.
5. Expiração (fim deslocado para o passado): ecrã mostra TEMPO EXPIRADO e "Tempo excedido +HH:MM:SS"; Q07 continua Ocupado; nenhum pagamento novo criado.
6. Saída: `actual_checkout_at`, minutos excedidos, Q07 Livre logo a seguir; registo `estadia.saida` lido diretamente na base de dados.
7. Segunda saída e extensão após encerramento recusadas; estado e pagamentos iguais antes/depois.
8. Duas saídas em simultâneo e duas extensões em simultâneo: só uma de cada aplica, a outra recebe mensagem clara.
9. Permissões, testadas diretamente nas operações do servidor:
   - Recepcionista: entra, recebe, sai se tudo pago, marca Pronto; não anula, não fecha com dívida, não muda preço, não põe manutenção, não estende sem pagar.
   - Administrador e Proprietário: anulam com motivo, fecham com dívida, estendem, gerem quartos.
   - Conta de fora e visitante sem sessão: não veem nem alteram nada.
10. Pagamentos: anulado continua no histórico com autor e motivo; apagar é bloqueado; a soma da estadia bate certo.
11. Tempo real: ação da Recepcionista chega ao Administrador e ao Proprietário, e vice-versa, no ecrã sem recarregar.
12. Verificação de código, compilação e abertura de /hospedagem em formato telemóvel sem erros na consola.
13. Entrada depois da meia-noite (ver abaixo).

## Teste 13 — entrada depois da meia-noite

Casos medidos na base de dados (estadia por noite, 1 noite, checkout 12:00):

```text
Início do dia | Entrada | Fim calculado hoje
00:00         | 01:21   | amanhã 12:00 (~34h)
00:00         | 23:30   | amanhã 12:00
06:00         | 01:21   | hoje 12:00  (conta como a noite anterior)
06:00         | 08:00   | amanhã 12:00
```

Avaliação: o sistema faz o que a configuração manda. Uma hospedaria que considera as chegadas de madrugada como "a noite anterior" deve usar um início do dia como 06:00, que já existe nas Configurações. Por isso, à partida não é erro de código e não se altera nada. Só será corrigido se algum caso não bater com a tabela acima. Recomendação para os pilotos, sem mudar código: combinar com cada hospedaria o início do dia (por exemplo 06:00).

## Limpeza

- No fim, apresento a lista exata dos IDs criados (estabelecimento, contas, quartos, tipos, hóspedes, estadias, pagamentos, convites, papéis, histórico) e confirmo que não incluem "Emas" nem contas reais.
- A remoção só é feita depois dessa lista estar apresentada. Os pagamentos só se apagam contornando a proteção nessa única operação, que continua ativa a seguir.

## Entrega

PASS/FAIL dos 13 pontos com evidência (valores lidos da base de dados e texto do ecrã), limitações reais (por exemplo, as 22:14 e a expiração são simuladas deslocando horas; "outro dispositivo" são duas sessões de browser), IDs de teste e o commit SHA.

## Notas técnicas

- Scripts temporários de teste em bun (clientes com sessão de cada papel, chamadas `rpc('op_*')`, `Promise.all` para concorrência, canal de tempo real em `rooms/stays/payments`) e Playwright em `/tmp/browser/ensaio`.
- Leitura da auditoria por consulta direta a `audit_logs` (`entity_id` = estadia).
- Deslocação de horas só na estadia de teste, com a chave de serviço; nenhuma migração prevista.
- Typecheck com `tsgo`, build com `bun run build`.
