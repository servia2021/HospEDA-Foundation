# HospEDA Foundation

Construir o HOSPEDA — MVP Fase 1: Fundação + autenticação + estrutura base. Contexto do produto: HOSPEDA é um SaaS mobile-first para hospedagens, pousadas, motéis e pequenos hotéis em Angola. A promessa é dar ao proprietário visibilidade e controle simples da operação e do dinheiro, mesmo quando não está fisicamente no local. Princípios obrigatórios: simples por fora, inteligente por dentro; mobile-first; cloud-first; low-bandwidth; offline-capable; multiutilizador; permissões por papel; auditável. NÃO criar servidor local obrigatório e NÃO depender de Wi-Fi. A cloud é a fonte central de verdade; o offline será implementado numa fase posterior.

Nesta Fase 1 NÃO implementar ainda reservas, estadias, consumos, serviços, caixa, relatórios, câmeras ou integrações complexas. Preparar uma arquitetura limpa e escalável para essas fases futuras.

Objetivo da Fase 1:
1) Criar shell da aplicação com navegação responsiva e excelente experiência mobile.
2) Criar autenticação segura (login/logout) e estrutura de sessão.
3) Criar onboarding inicial da hospedaria: nome do estabelecimento, telefone, endereço/cidade e moeda padrão AOA/Kz.
4) Criar estrutura de utilizadores e papéis: Proprietário, Administrador e Recepcionista. Preparar permissões por papel, sem construir ainda um painel complexo de gestão de permissões.
5) Criar layout base com sidebar no desktop e bottom navigation/mobile navigation no telemóvel.
6) Criar Dashboard inicial com estado vazio elegante e cards/áreas preparadas para: Ocupação, Disponíveis, Check-ins, Check-outs, Receita, Recebido, Pendente e Alertas. Não inventar dados; usar empty states ou dados claramente demo apenas se necessário para visualização.
7) Criar páginas placeholder funcionais para: Dashboard, Hospedagem, Consumos, Caixa, Operação, Relatórios e Configurações, deixando claro quais módulos ainda estão por implementar.
8) Criar sistema visual premium, limpo, profissional e muito simples, adequado a um produto SaaS B2B para Angola. Priorizar legibilidade, poucos elementos por tela, ações primárias evidentes e excelente uso em telemóveis.
9) Criar base de dados/esquema inicial apenas para autenticação, estabelecimento/tenant, utilizadores e papéis, preparada para multi-tenant. Cada estabelecimento deve ficar isolado dos demais.
10) Preparar auditoria estrutural para ações futuras, mas não construir ainda todos os eventos de negócio.

Regras de produto:
- Não transformar o HOSPEDA em ERP.
- Não adicionar funcionalidades que não foram solicitadas.
- Não usar gráficos decorativos no Dashboard vazio.
- Não depender de conexão permanente nesta fase; apenas deixar a arquitetura preparada para offline/sincronização futura.
- Não adicionar integração de câmeras agora; apenas deixar uma área de integrações futura em Configurações se necessário.
- A interface deve ser em português (PT-PT), usando Kz/AOA para moeda.
- O design deve parecer produto real pronto para demonstração, não um template genérico.
- Priorizar componentes reutilizáveis, tipagem forte e arquitetura limpa.

Antes de implementar, organize a estrutura técnica para permitir as próximas fases sem refatoração desnecessária. Depois implemente apenas esta Fase 1 e valide que autenticação, isolamento por estabelecimento, navegação e estados vazios funcionam corretamente.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/87e9b8b2-6d7c-4a51-8eea-ba74c17fa1d2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
