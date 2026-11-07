# Dashboard “Premium Corporate” — plano mínimo

## Estado observado
- O Dashboard já usa a mesma consulta operacional da Hospedagem, atualiza periodicamente e preserva os estados de carregamento, erro, estabelecimento ausente e alertas.
- A apresentação atual é funcional, mas quase todos os indicadores têm o mesmo peso visual: grelhas uniformes, títulos de secção discretos e espaçamento constante.
- O sistema visual existente já oferece os tokens necessários: superfícies claras, verde-petróleo institucional, cobre para dinheiro, tipografia `Plus Jakarta Sans`/`Manrope`, sombras e estados sem conteúdo reutilizáveis.

## Alteração proposta
1. Alterar somente `src/routes/_authenticated/dashboard.tsx`.
2. Reorganizar visualmente, sem mudar ordem semântica nem conteúdo:
   - cabeçalho com mais separação do corpo;
   - títulos de secção com hierarquia e divisores discretos;
   - bloco de ocupação com maior destaque para o indicador principal e grelha responsiva mais editorial;
   - bloco financeiro com leitura prioritária de “Recebido”, mantendo exatamente os três indicadores e valores;
   - alertas mais compactos e escaneáveis, sem mudar textos, condições ou ações;
   - botão “Abrir Hospedagem” integrado ao fecho da página, preservando o mesmo link.
3. Usar apenas classes e tokens semânticos já existentes. Não alterar componentes partilhados, tokens globais, cores, lógica, consultas, permissões ou dados.
4. Manter todos os textos funcionais atuais, incluindo mensagens de erro, estados vazios, rótulos, dicas e nome/papel do estabelecimento.

## Ficheiros
- **A alterar numa futura execução:** `src/routes/_authenticated/dashboard.tsx`.
- **A reutilizar sem alteração:** `src/components/metric-card.tsx`, `src/components/page-header.tsx`, `src/components/empty-state.tsx`, componentes de botão/badge e `src/styles.css`.

## Riscos e contenção
- **Destaque excessivo em ecrãs pequenos:** limitar mudanças a grelhas responsivas e verificar 375 px, tablet e desktop.
- **Quebra de alinhamento com valores longos em Kz:** manter dimensões estáveis e testar números extensos.
- **Regressão funcional acidental:** não tocar no bloco de cálculo/consulta; restringir a edição à estrutura JSX e classes visuais.
- **Impacto noutras páginas:** evitado ao não alterar componentes nem estilos partilhados.
- **Reversibilidade:** uma única alteração num único ficheiro, sem migrações nem efeitos em dados.

## Validação prevista
1. Comparação visual do Dashboard em 375×812, 768×1024 e 1280×900, nos estados com dados, sem quartos, erro e carregamento.
2. Confirmar ausência de sobreposição, corte de valores, deslocamentos inesperados e perda de contraste.
3. Confirmar que todos os indicadores, alertas, badge de papel e link continuam presentes e com o mesmo conteúdo.
4. Confirmar que a consulta, atualização de 30 segundos e atualização ao focar a janela permanecem inalteradas.
5. Executar a verificação de tipos e observar o build automático e a consola do browser.

## Créditos
Não é possível garantir o custo exato antecipadamente. O âmbito de um único ficheiro torna a execução pequena e plausível, mas **0,90 créditos deixa pouca margem para inspeção visual, correções e repetição dos testes**. A opção mais segura é esperar por mais créditos. Se for necessário avançar com esse saldo, deve ser feita uma única passagem conservadora, sem imagens, novos componentes ou alterações globais, aceitando que uma segunda ronda pode ficar pendente.
