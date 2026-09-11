# Changelog (Histórico de Alterações) — CapIAu-CurIA

Todas as alterações notáveis neste projeto serão documentadas neste arquivo. O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [3.1.0] - 2026-09-11

Versão de produção com arquitetura Fullstack Serverless para a Vercel, Construtor de Rigs Interativo, Planejamento Cognitivo e blindagem de segurança de endpoints.

### Adicionado
- **Arquitetura Serverless para Vercel (`api/index.js` & `vercel.json`)**: Migração da camada de backend para Vercel Serverless Functions sob demanda com rewrites para SPA, preservando execução local com `node server.js` e proxy reverso no Vite.
- **Cabeçalhos de Segurança HTTP (Security Headers)**: Políticas `nosniff`, `DENY` para iframes, sanitização XSS e `strict-origin-when-cross-origin` configurados no `vercel.json`.
- **Planejamento Cognitivo & Timeline Glassmorphic**: O sistema interpreta intenções complexas de busca e decompõe pedidos em setups estruturados, com exibição de progresso em tempo real na interface.
- **Construtor Interativo de Rigs no Chatbot CurIA**: Propostas de setups geradas por IA que podem ser editadas, refinadas e salvas diretamente no acervo local como um Rig.
- **Sanitização de URLs Externas**: Implementação de `sanitizeUrl` no `SuperMenu.tsx` para validação de esquemas de links (`http://` e `https://`), protegendo contra injeção de scripts maliciosos.
- **Guia de Provedores de API (`docs/referencia-provedores-api.md`)**: Documentação estruturada com links oficiais, limites e instruções de integração para todas as APIs suportadas.

### Corrigido
- **Vulnerabilidades de Dependências (`npm audit`)**: Resolução de 7 vulnerabilidades de dependências, alcançando 0 vulnerabilidades.
- **Compilação TypeScript**: Resolução de erros `TS6133` no `tsc -b`.

---

## [1.1.0] - 2026-06-09

Esta versão foca inteiramente na estabilidade técnica, resiliência de rede do backend e eliminação de dados sintéticos/alucinados na interface de pesquisa de equipamentos.

### Adicionado
- **Timeouts de Requisição**: Implementado limite estruturado de 45 segundos usando `AbortController` nas requisições do backend proxy (`server.js`) e 35/45 segundos no frontend (`ChatAssistant.tsx`) para evitar travamentos infinitos e telas congeladas em caso de lentidão da API.
- **Substituição de Tokens para URLs**: Adicionada lógica de extração e mapeamento de links de lojas e manuais (`LINK_X` e `THUMB_X`) para impedir que os modelos LLM alucinem links apontando para `localhost` ou domínios falsos. O proxy backend agora restaura os links originais capturados pelas buscas de API.
- **Prompt System Instructions**: Ajustados os prompts de consolidação de dados e chat para incluir diretrizes estritas contra sugestão de acessórios, manuais ou softwares de marcas concorrentes no campo de comparação de modelos equivalentes.

### Alterado
- **Migração de Modelos LLM**: Atualização de modelos obsoletos e depreciados para o `google/gemini-2.5-flash` tanto na configuração do frontend (`Sidebar.tsx`) quanto no roteamento padrão do proxy backend.
- **Roteamento Direto do Google AI Studio**: Refatorada a chamada da API do Google AI Studio para usar a instrução do sistema (`systemInstruction`) de forma nativa e limpa.

### Removido
- **Gerador Procedural Sintético (Fail-Safe)**: Remoção total do módulo procedural offline (`src/services/proceduralGenerator.ts`) e de todos os componentes visuais correspondentes que simulavam especificações fictícias. O sistema agora opera 100% sob dados de pesquisas reais em APIs reais (Serper, Tavily, Exa).

---

## [1.0.0] - 2026-06-08

Lançamento inicial da plataforma **CapIAu-CurIA** focada na curadoria de equipamentos audiovisuais e setups de produção.

### Adicionado
- **Sidebar 4-em-1**: Barra lateral retrátil contendo painéis para gerenciamento de filtros de busca, histórico de pesquisas persistente, acervo local de favoritos e perfil personalizado do usuário.
- **Super Menu 7-em-1 Reordenável**: Painel overlay interativo e customizável com 7 blocos informativos sobre o equipamento (Ficha Técnica, Comparativos, Acervo Local, Gears Similares, Manuais Técnicos, Manutenção e Custos).
- **Banco de Dados Local (Dexie.db)**: Persistência no navegador de rigs de câmeras, notas de campo personalizadas, pontuação de estrelas para favoritos e histórico detalhado.
- **Proxy Backend de Agregação de APIs**: Servidor Express com suporte a consultas consolidadas usando APIs de pesquisa estruturada (Tavily, Exa, Serper) e orquestração de LLMs (OpenRouter e Google AI Studio).
