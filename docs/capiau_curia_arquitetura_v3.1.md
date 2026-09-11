# CapIAu-CurIA — Arquitetura de Referência v3.1
## Ferramenta de Pesquisa Inteligente para Equipamentos Audiovisuais

**Versão:** 3.1  
**Data:** 2026-06-09  
**Status:** Arquitetura de Produção — Free Tier + Escalabilidade Paga + Integração Google Cloud + Fóruns & Comunidades  
**Compatibilidade:** Ecossistema CapIAu-CurIA

---

## 1. Visão Geral

O **CapIAu-CurIA** (Curador de Inteligência Audiovisual) é o módulo de pesquisa inteligente do ecossistema CapIAu. Ele consolida múltiplas camadas de APIs — desde busca web semântica até scraping enterprise, extração de dados estruturados, grounding com Google Cloud e **indexação de fóruns e comunidades do setor audiovisual** — em uma única interface, entregando fichas técnicas, comparativos de preços, troubleshooting, compatibilidade e tendências para equipamentos audiovisuais.

A arquitetura opera em **três modos**:
- **Modo Desenvolvedor (Free):** 100% gratuito, sem cartão de crédito, para prototipagem e uso individual. Com rotação inteligente de APIs, entrega **12.000+ requisições/mês sem pagar nada**.
- **Modo Produção (Pago):** APIs de scraping enterprise e dados estruturados para alta confiabilidade.
- **Modo Cloud (Google Cloud):** Grounding com Gemini Enterprise Agent Platform para data stores customizados e pesquisa profunda automatizada.

---

## 2. Propósito e Escopo por Fase

| Fase do Produto Audiovisual | O que o CapIAu-CurIA entrega |
|-----------------------------|---------------------------|
| **Desenvolvimento** | Pesquisa de referências técnicas, estética e equipamentos usados em filmes similares via TMDb + busca semântica + fóruns |
| **Pré-Produção** | Orçamento, compatibilidade, checklist de acessórios, decisão compra vs. locação com histórico de preços + opinião de comunidades |
| **Produção** | Troubleshooting em campo, manuais, firmware, soluções de emergência com extração de fóruns e threads técnicas |
| **Pós-Produção** | Feedback técnico ao acervo (problemas descobertos na edição) com dados estruturados de reviews e comunidades |
| **Distribuição** | Custo real de equipamento por produção, DRE, compliance, seguro, depreciação automática |

---

## 3. Arquitetura em 5 Camadas

```
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 1: INTERFACE (React SPA)                            │
│  - Input: texto, imagem, serial, URL, voz (futuro)          │
│  - Filtros: categoria, preço, review, compatibilidade        │
│  - Visualização: tabelas, cards, timelines, comparativos     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 2: ORQUESTRADOR INTELIGENTE (Node.js Proxy)        │
│  - Intent Router: classifica a busca em 8 modos              │
│  - API Selector: escolhe a melhor API baseado em QoS        │
│  - Token Manager: substitui URLs por tokens (anti-alucinação)│
│  - Cache Manager: SQLite + Redis com TTL dinâmico           │
│  - Circuit Breaker: isola APIs falhas, ativa fallback      │
│  - Rate Limiter: respeita quotas do free tier                │
│  - Rotation Manager: rotaciona créditos entre APIs free      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 3: BUSCA & DESCobERTA (Web Search + Fóruns)        │
│  Tier Free: Serper.dev, Exa, Tavily, Reddit API              │
│  Tier Pago: DataForSEO, Scrape.do, Bright Data              │
│  Tier Scraping: Diffbot, Firecrawl, Scrape.do, Zyte          │
│  Tier Cloud: Gemini Grounding (Google Search)               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 4: EXTRAÇÃO ESTRUTURADA (Product Data + Fóruns)     │
│  Tier Free: TMDb, OMDb, Reddit API, Google Shopping        │
│  Tier Pago: DataForSEO Merchant, Keepa, Diffbot              │
│  Tier Scraping: Bright Data, Scrape.do, Apify                │
│  Tier Cloud: Gemini Data Stores (Agent Search)               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 5: INTELIGÊNCIA (LLM + Agentes)                     │
│  Tier Free: OpenRouter (modelos :free)                      │
│  Tier Pago: OpenRouter (modelos pagos baixo custo)          │
│  Tier Cloud: Gemini Enterprise Agent Platform              │
│    - Antigravity (Deep Research)                             │
│    - Managed Agents (sandbox Linux remoto)                   │
│    - Grounding com Google Search + Data Stores               │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Stack Completo de APIs

### 4.1 Tier 0: Free Tier — Zero Cartão (MVP)

#### 4.1.1 APIs de Busca Web

| API | Free Tier | Cartão? | Função no CapIAu-CurIA | TTL Cache |
|-----|-----------|---------|----------------------|-----------|
| **Serper.dev** | 2.500 queries/mês | **Não** | Busca Google pura, principal fonte | 7 dias |
| **Tavily** | 1.000 créditos/mês | **Não*** | Extração de conteúdo completo (RAG) | 14 dias |
| **Exa** | 1.000 requests + $10 créditos | **Não** | Busca semântica neural | 30 dias |
| **Firecrawl** | 1.000 créditos/mês | **Não** | Scraping de fallback → Markdown limpo para LLM | 14 dias |
| **TMDb** | 40 req/10s | **Não** | Metadados filmes/TV | 30 dias |
| **OMDb** | 1.000/dia (Patron) | **Não** | Lookup IMDb ID | 30 dias |
| **OpenRouter** | 1.000 req/dia (com $10) | **Não** | LLM agregador | 1 dia |

> *Tavily: não encontrou-se menção explícita a cartão na documentação pública. Confirmar no momento do cadastro.

#### 4.1.2 APIs de Fóruns e Comunidades

| API | Free Tier | Cartão? | Função | TTL Cache |
|-----|-----------|---------|--------|-----------|
| **Reddit API** | Ilimitado (OAuth) / 30 req/min anônimo | **Não** | r/cinematography, r/filmmakers, r/filmmakergear, r/videography, r/photography | 7 dias |
| **Diffbot** | **10.000 créditos/mês** (5 calls/min) | **Não** | Extração estruturada de fóruns sem API (Cinematography.com, DVXUser, fóruns brasileiros) | 14 dias |
| **Scrape.do** | **1.000 créditos/mês** (só paga se bem-sucedido) | **Não** | Fallback para fóruns protegidos | 7 dias |
| **ScraperAPI** | **1.000 créditos/mês** + 5.000 trial (7 dias) | **Não** | Scraping simples de sites estáticos | 7 dias |
| **Apify** | **$5 em créditos/mês** (renova automaticamente) | **Não** | Actors de scraping para fóruns e e-commerces | 7 dias |
| **HasData** | **1.000 créditos** + 100/dia quando saldo < 100 | **Não** | Requests sem multiplicadores escondidos | 7 dias |

**Capacidade total estimada (Free Tier com cache e rotação):** ~12.000–15.000 requisições/mês

---

### 4.2 Tier 1: Pago Acessível — Escalabilidade Inicial

| API | Preço | Free Tier? | Função | Quando usar |
|-----|-------|-----------|--------|-------------|
| **DataForSEO** | $0,001–$0,002/task | Não | Google Shopping, Amazon, Bing, Yahoo, Yandex | Quando SerpAPI for caro e lento. **15x mais barato que SerpAPI** para batch. |
| **Scrape.do** | $29/mês (250K req) | 1.000/mês | Scraping com proxy rotativo, Markdown output, baixa latência | Quando Firecrawl não conseguir passar de proteções. **98,19% success rate**. |
| **ScrapingBee** | $49/mês (250K créditos) | 1.000 créditos | Scraping simples, APIs dedicadas Amazon/Google/YouTube | Cuidado com multiplicadores de crédito (5x–75x). |
| **Keepa** | Assinatura mensal | Não | Histórico de preços Amazon (6 bilhões de produtos) | Quando precisar de dados de depreciação e valor residual. |
| **SerpAPI** | $75/mês (5K buscas) | 250/mês | Multi-engine (80+ engines) | **Só quando necessário** — Google Shopping + Amazon + eBay + YouTube em uma só chamada. |

---

### 4.3 Tier 2: Enterprise — Alta Confiabilidade

| API | Preço | Free Tier? | Função | Quando usar |
|-----|-------|-----------|--------|-------------|
| **Bright Data** | $0,75/1K requests | 1K trial (1 semana) | Scraping enterprise: **98,44% success rate**, 400M+ IPs | Volume > 500K requests/mês ou sites protegidos. **Pay only for success**. |
| **Diffbot** | $299/mês (Startup) | **10K/mês** | Extração AI automática de produtos, artigos, discussões, fóruns | Quando não quer escrever scrapers. Knowledge Graph incluso. |
| **Zyte** | $0,13–$1,27/1K requests (HTTP) | $5 trial (30 dias) | Scrapy + infra gerenciada + AI extraction | Já usa Scrapy e quer escalabilidade. **38.000 páginas com $5 de crédito**. |

---

### 4.4 Tier 3: Google Cloud — Grounding & Agentes

| Serviço | Preço | Free Tier | Função | Quando usar |
|---------|-------|-----------|--------|-------------|
| **Gemini Grounding (Google Search)** | **$14/1K queries** (Gemini 3) ou **$35/1K** (Gemini 2.5) | 5.000 prompts/mês (Gemini 3) ou 1.500 RPD (Gemini 2.5) | Respostas do LLM ancoradas em resultados do Google Search em tempo real | Apenas para queries onde síntese com fontes é mais importante que custo. **Não substitui Serper para volume.** |
| **Gemini Data Stores (Agent Search)** | Custos de storage + indexação GCP | Trial GCP | Indexação de documentos próprios (manuais, reviews, catálogos, **fóruns indexados**) para grounding customizado | **Diferencial estratégico:** Criar base de conhecimento do setor audiovisual para grounding com dados próprios. |
| **Antigravity (Managed Agent)** | Custo do modelo Gemini + execução | Preview (limitado) | Agente autônomo em sandbox Linux que pesquisa, executa código e gera relatórios | Pesquisas profundas automatizadas (Deep Research) de equipamentos. Ainda em **Pre-GA** — não usar para dados confidenciais. |
| **Gemini Enterprise Agent Platform** | Enterprise pricing | Preview | Governança, DLP, audit, multi-team | Quando o CapIAu-CurIA for adotado por equipe/organização com compliance rigoroso. |

---

### 4.5 APIs Excluídas da Arquitetura

| API | Motivo da Exclusão |
|-----|-------------------|
| **Brave Search API** | A partir de fev/2026, exige cartão de crédito obrigatório no cadastro. Cobranças automáticas sem hard cap. |
| **Amazon PA-API 5.0** | **Deprecated em 30/04/2026**. Requer Amazon Associates ativo. Substituído por Creators API. |
| **Trustpilot API** | Só Enterprise ($6K–$30K/ano). Não justifica para equipamentos audiovisuais. |
| **G2 API** | Foco em software B2B, não equipamentos físicos. Reviews com problemas de autenticidade. |
| **Rainforest API** | Mínimo $66/mês, sem free tier permanente. Focado apenas em Amazon. Não justifica para o modelo de rotação de créditos do CapIAu-CurIA. |
| **Google Grounding (uso indiscriminado)** | Custo elevado ($14–$35/1K) e imprevisível (cada prompt pode disparar múltiplas queries internas). Lock-in Gemini. |

---

## 5. Panorama de Fóruns e Comunidades Indexáveis

### 5.1 Fóruns com API Nativa (Implementar Imediatamente)

| Fórum | Foco | API | Endpoint Exemplo | Uso no CapIAu-CurIA |
|-------|------|-----|------------------|---------------------|
| **Reddit — r/cinematography** (391K membros) | Câmeras, lentes, iluminação, grip | Reddit API (REST/JSON) | `https://www.reddit.com/r/cinematography/search.json?q=Sony+FX6&restrict_sr=1` | Buscar threads por equipamento, extrair sentimento e recomendações da comunidade |
| **Reddit — r/filmmakers** | Produção, equipamentos, workflow | Reddit API | `https://www.reddit.com/r/filmmakers/search.json?q=best+documentary+camera` | Opiniões sobre workflow e equipamentos para produção |
| **Reddit — r/filmmakergear** | Rigs, cages, lentes, microfones, slates | Reddit API | `https://www.reddit.com/r/filmmakergear/search.json?q=SmallRig+cage` | Compatibilidade de acessórios, setups reais |
| **Reddit — r/videography** | Câmeras de vídeo, drones, gimbals | Reddit API | `https://www.reddit.com/r/videography/search.json?q=gimbal+2026` | Tendências de equipamentos de vídeo |
| **Reddit — r/photography** | Câmeras, lentes, acessórios | Reddit API | `https://www.reddit.com/r/photography/search.json?q=lens+review` | Reviews de lentes com overflow para vídeo |

**Rate Limits Reddit:**
- OAuth: 60 req/min
- Anônimo: 30 req/min
- **Dica:** Use OAuth para maior throughput. Pushshift (arquivo histórico) para dados históricos, embora a disponibilidade tenha variado.

### 5.2 Fóruns sem API — Extração via Diffbot / Scraping

| Fórum | Foco | Plataforma | Extração | Uso no CapIAu-CurIA |
|-------|------|-----------|----------|---------------------|
| **Cinematography.com** | Câmeras, lentes, iluminação, grip profissional | Software proprietário | Diffbot (10K créditos/mês free) | Threads técnicas de equipamentos pro, discussões de DP |
| **DVXUser** | Panasonic, Canon, Sony — ativo desde 2000 | phpBB-like | Diffbot ou Zyte | Discussões históricas, troubleshooting de firmware |
| **Luminous-Landscape (LuLa)** | Medium format, câmeras high-end | Plataforma própria | Diffbot (conteúdo premium pode ser restrito) | Reviews de câmeras high-end, comparações técnicas |
| **Photrio.com** | Sucessor do DPReview (film/fotografia) | Discourse (possível API) | Discourse API se instância pública, ou Diffbot | Reviews de câmeras, discussões de lentes |
| **FredMiranda** | Reviews de lentes e câmeras | Plataforma própria | Diffbot | Reviews de lentes com foco em fotografia |
| **Steve's Digicams / Imaging Resource** | Reviews técnicos de câmeras | Plataforma própria | Diffbot ou Firecrawl | Specs detalhadas, testes de sensor |

### 5.3 Sites de Review Indexáveis

| Site | Conteúdo | Acesso | Uso no CapIAu-CurIA |
|------|----------|--------|---------------------|
| **RTINGS.com** | Reviews técnicos de TVs, monitores, headphones, câmeras | Sem API. Assinatura paga em 2026. Scraping com Diffbot/Zyte | Testes de input lag, color accuracy, comparações técnicas |
| **CNET** | Reviews de câmeras com ratings | Sem API. Feeds RSS disponíveis | Reviews gerais, notícias de lançamentos |
| **No Film School** | Notícias, reviews, comunidade | Sem API. RSS/feed de notícias | Notícias de lançamentos, reviews de equipamentos |
| **Cinema5D** | Reviews de câmeras cinema, hands-on | Sem API. Scraping com Diffbot | Reviews técnicos, testes de câmeras cinema |
| **NewsShooter** | Reviews de equipamentos pro, NAB/IBC | Sem API. Scraping com Diffbot | Reviews de lançamentos, hands-on de feiras |
| **43rumors** | Rumores e leaks de câmeras | Sem API. Scraping com Firecrawl | Antecipação de lançamentos, rumors de especificações |

### 5.4 E-commerces com Dados de Produtos

| Loja | API | Acesso | Uso no CapIAu-CurIA |
|------|-----|--------|---------------------|
| **B&H Photo** | API de Afiliados (Impact, CJ Affiliate) | Catálogo, preços, specs. **Não reviews de usuários.** | Preços, disponibilidade, specs oficiais |
| **Adorama** | API de Afiliados | Catálogo, preços, specs | Preços, disponibilidade |
| **Moment** | API de Afiliados (Impact) | Acessórios mobile filmmaking | Preços de acessórios, grip |

### 5.5 Instituições Brasileiras (Sem API, mas relevantes)

| Instituição | Foco | Acesso | Uso no CapIAu-CurIA |
|-------------|------|--------|---------------------|
| **FORCINE** | Ensino, pesquisa, equipamentos acadêmicos | Site institucional. Sem API. | Referências acadêmicas, pesquisas de cinema |
| **API (Associação Produtoras Independentes)** | Produção independente, políticas públicas | Sem API. | Dados de mercado, políticas públicas |
| **APRO** | Mercado, equipamentos, financiamento | Sem API. | Dados de mercado audiovisual brasileiro |
| **Grupos Facebook** | Compra/venda, dicas de equipamentos | Facebook Graph API (restrita) ou CrowdTangle (Meta) | Tendências de mercado brasileiro, preços de usado |

---

## 6. Estratégia de Rotação Inteligente de APIs (Free Tier)

### 6.1 Princípio

Como a maioria dos fóruns de nicho **não oferece APIs nativas**, o CapIAu-CurIA usa uma **arquitetura de rotação** que distribui requisições entre múltiplas APIs de scraping gratuitas, maximizando volume sem pagar nada.

### 6.2 Ordem de Rotação por Tipo de Conteúdo

#### Para Fóruns e Reviews:

```
1. Reddit API (nativa, ilimitada com OAuth)
   → Buscar threads por equipamento
   → Extrair posts, comentários, sentimento

2. Diffbot (10.000 créditos/mês)
   → Extrai threads de fóruns sem API (Cinematography.com, DVXUser)
   → Retorna JSON estruturado: título, autor, data, texto, imagens
   → 1 crédito = 1 página extraída

3. Firecrawl (1.000 créditos/mês)
   → Sites de review (RTINGS, CNET, Cinema5D)
   → Retorna Markdown limpo (67% menos tokens que HTML)
   → Ideal para alimentar pipeline de LLM

4. Scrape.do (1.000 créditos/mês)
   → Fallback para sites que quebraram nas anteriores
   → Só paga se bem-sucedido (requests falhos = grátis)

5. ScraperAPI (1.000 créditos/mês)
   → Sites simples estáticos (evitar Google/Amazon — multiplicadores pesados)
   → Google custa 25× créditos, Amazon 5×, LinkedIn 30×

6. Apify ($5 créditos/mês — renova automaticamente)
   → Actors de scraping para fóruns e e-commerces específicos
   → Compute units variáveis

7. HasData (1.000 créditos + 100/dia quando saldo < 100)
   → Requests sem multiplicadores escondidos
   → Fallback de emergência
```

#### Para E-commerces e Preços:

```
1. DataForSEO ($0,001/task — pago, mas barato)
   → Google Shopping, Amazon, eBay, Bing
   → 15x mais barato que SerpAPI

2. Serper.dev (2.500/mês — free)
   → Busca Google pura para descoberta de preços

3. SerpAPI (250/mês — free, limitado)
   → Só para multi-engine específico (Google + Amazon + eBay + YouTube)

4. Keepa (pago)
   → Histórico de preços Amazon para depreciação
```

### 6.3 Cenário Real: Pesquisar uma Câmera (Sony FX30)

| Passo | API | Custo | Conteúdo Extraído |
|-------|-----|-------|-------------------|
| Buscar threads no Reddit | Reddit API (nativa) | $0 | Discussões, opiniões, problemas reportados |
| Extrair review do B&H Photo | Diffbot (1 crédito) | $0 | Specs, preço, descrição técnica |
| Extrair specs do RTINGS | Firecrawl (1 crédito) | $0 | Testes técnicos, color accuracy, input lag |
| Extrair discussão no Cinematography.com | Diffbot (1 crédito) | $0 | Threads técnicas de DPs, compatibilidade |
| Extrair review do Cinema5D | Firecrawl (1 crédito) | $0 | Hands-on, testes de vídeo, codecs |
| Fallback para fórum protegido | Scrape.do (1 crédito) | $0 | Conteúdo que as anteriores não pegaram |
| Buscar preços Google Shopping | Serper.dev (1 query) | $0 | Links de lojas, preços |
| **Total para 1 equipamento completo** | | **$0** | ~8–10 fontes de dados |

**Se você pesquisar 50 equipamentos por mês**, usando ~10 páginas por equipamento = 500 requisições. **Todas caem dentro dos free tiers.**

### 6.4 Capacidade Total de Rotação (Free Tier)

| API | Free Tier/mês | Tipo de Conteúdo | Quando esgotar |
|-----|---------------|------------------|----------------|
| Reddit API | Ilimitado (OAuth) | Fóruns, discussões, opiniões | Nunca esgota (throttle apenas) |
| Diffbot | 10.000 | Fóruns sem API, reviews estruturados | Pular para Firecrawl |
| Firecrawl | 1.000 | Sites de review em Markdown | Pular para Scrape.do |
| Scrape.do | 1.000 | Fallback de sites protegidos | Pular para ScraperAPI |
| ScraperAPI | 1.000 | Sites simples estáticos | Pular para Apify |
| Apify | $5 créditos | Actors de scraping | Pular para HasData |
| HasData | 1.000 + 100/dia | Requests sem multiplicadores | Pular para Zyte (PAYG) |
| Serper.dev | 2.500 | Busca Google | Pular para DataForSEO (pago) |
| Tavily | 1.000 | Extração de conteúdo | Pular para Firecrawl |
| Exa | 1.000 | Busca semântica | Pular para Serper |

**Total de requisições gratuitas mensais:** ~17.500+ (incluindo Reddit ilimitado)  
**Com cache (3x economia):** ~52.000 consultas reais/mês sem pagar nada

---

## 7. Análise Profunda: Gemini Enterprise Agent Platform

### 7.1 O que é o Grounding no Gemini Enterprise Agent Platform

O **grounding** no Gemini Enterprise Agent Platform permite que o LLM gere respostas baseadas em **dados externos em tempo real**, não apenas em seu conhecimento de treinamento. Ele oferece duas fontes de grounding:

1. **Google Search Results:** Dados públicos indexados pelo Google. O LLM consulta o Google Search em tempo real e ancora a resposta nos resultados.
2. **Agent Search Data Stores:** Dados customizados do usuário — websites, documentos não estruturados (PDF, HTML, TXT), dados estruturados, **fóruns indexados** — indexados em um data store no Google Cloud.

**Benefícios do grounding:**
- Reduz alucinações (o LLM não inventa fatos)
- Ancora respostas em informações específicas e verificáveis
- Aumenta credibilidade, precisão e atualidade das respostas

### 7.2 Preços do Grounding (2026)

| Modelo | Free Tier | Pago | Observação |
|--------|-----------|------|------------|
| **Gemini 3.x** | 5.000 prompts/mês (compartilhado) | **$14/1.000 search queries** | Cada prompt pode disparar 1+ queries internas |
| **Gemini 2.5 Pro** | 1.500 RPD | **$35/1.000 grounded prompts** | Mais caro, mas modelo mais capaz |
| **Gemini 2.5 Flash** | 1.500 RPD (compartilhado com Flash-Lite) | **$35/1.000 grounded prompts** | Melhor custo-benefício para grounding |
| **Gemini 2.0 Flash** | 500 RPD | **$35/1.000 grounded prompts** | Free tier muito limitado |

> **Risco de custo:** A documentação oficial alerta: *"O cliente envia um prompt para o Gemini, e o sistema pode enviar uma ou mais queries para o Google Search. Você paga por cada query de busca separadamente."* Isso torna o custo **imprevisível** — um único prompt complexo pode custar $0,14–$0,70 em grounding sozinho.

### 7.3 Managed Agents (Antigravity)

Os **Managed Agents** no Gemini API são agentes autônomos que rodam em **sandbox Linux remoto hospedado pelo Google**. Um único API call provisiona o ambiente, inicia o agente e executa a tarefa.

**O que o Antigravity pode fazer:**
- Raciocinar e planejar usando o harness do Gemini
- Executar código e gerenciar arquivos em ambiente Linux isolado
- Navegar na web para buscar e processar dados em tempo real
- Usar tools: web search, code execution, file I/O

**Ambientes persistentes:** O primeiro call retorna um `environment_id`. Chamadas subsequentes com o mesmo ID retomam o ambiente com todos os arquivos, pacotes e estado preservados.

**Forking de ambientes:** Você pode iterar interativamente com o Antigravity, instalar dependências, criar templates — e depois "forkar" esse snapshot em um agente nomeado e reutilizável.

**Proxy de credenciais:** O egress proxy permite:
- **Allowlist:** Restringir conexões outbound para domínios explícitos
- **Header transforms:** Injetar credenciais server-side (o sandbox nunca vê o token)

**Status:** Managed Agents estão em **preview (Pre-GA)**. A documentação oficial alerta: *"não deve ser usado para dados confidenciais ou sensíveis, nem para ambientes comerciais ou de produção"*.

### 7.4 O que APROVEITAR do Gemini Enterprise Agent Platform

#### ✅ Data Stores (Agent Search) — **APROVEITAR FORTEMENTE**

**Oportunidade estratégica:** Criar um **data store customizado** no Google Cloud com documentos do setor audiovisual:
- Manuais técnicos de câmeras, lentes, monitores, grip
- Reviews de sites especializados (Cinema5D, NewsShooter, NoFilmSchool)
- **Fóruns técnicos indexados** (DVXuser, Reddit r/cinematography, Cinematography.com via Diffbot)
- Catálogos de locadoras e distribuidores
- Press releases de fabricantes (Sony, Canon, Blackmagic, ARRI)

**Como funciona:**
1. Upload de documentos para Cloud Storage (PDF, HTML, TXT)
2. Criação de Data Store no Agent Platform
3. Configuração de Agent Search app vinculada ao data store
4. O LLM, ao fazer grounding, consulta **seus dados próprios** em vez de (ou além de) a web geral

**Vantagem competitiva:** Nenhuma outra API do mercado oferece grounding com uma base de conhecimento **customizada do setor audiovisual**. Isso permite ao CapIAu-CurIA responder perguntas como:
- *"Qual a diferença entre o firmware 4.0 e 5.0 da FX6?"* — consultando manuais próprios
- *"A Tilta SmallRig cage funciona com o V-mount da Core SWX?"* — consultando reviews indexados
- *"Como resolver o artefato de cor no Ninja V quando usado com FX3?"* — consultando fóruns indexados
- *"O que a comunidade do r/cinematography diz sobre a C70 vs FX6?"* — consultando threads de Reddit indexadas

**Custo:** Apenas storage GCP + indexação (custo marginal para volumes moderados). O grounding em data stores próprios não tem custo de search query adicional — diferente do grounding com Google Search.

#### ⚠️ Grounding com Google Search — **USAR COM MODERAÇÃO**

**Quando usar:**
- Queries simples onde o usuário quer uma resposta sintetizada rapidamente
- Verificação de fatos em tempo real (lançamentos, preços, disponibilidade)
- Quando a conveniência de "uma só chamada" (LLM + busca + síntese) vale o custo

**Quando NÃO usar:**
- Busca de preços em massa (DataForSEO a $0,001/task é 14.000x mais barato)
- Scraping de conteúdo completo (Tavily/Exa são mais baratos e controláveis)
- Operações de alto volume (Serper a $0,30/1K é 47x mais barato)
- Extração de fóruns (Reddit API + Diffbot são gratuitos)

**Estratégia de mitigação de custo:**
- Limitar grounding do Gemini a **5.000 prompts/mês** (free tier Gemini 3)
- Usar apenas para queries onde a síntese com citações é crítica
- Para volume, manter Serper/DataForSEO como primárias
- Para fóruns, manter Reddit API + Diffbot como primárias

#### ⚠️ Antigravity (Managed Agents) — **USAR EM EXPERIMENTAÇÃO**

**Quando usar:**
- Pesquisas profundas automatizadas (Deep Research) de equipamentos
- Tarefas que exigem múltiplos passos: buscar → extrair → comparar → gerar relatório
- Prototipagem de agentes autônomos para o CapIAu-CurIA

**Quando NÃO usar (ainda):**
- Produção com dados confidenciais (status Pre-GA)
- Tarefas que precisam de 99,9% uptime (preview pode ter instabilidade)
- Ambientes onde o lock-in no Google Cloud é problemático

**Estratégia:**
- Usar Antigravity em **modo experimental** para gerar templates de pesquisa
- Quando o template estiver validado, replicar a lógica com OpenRouter + APIs de busca (mais barato e portável)
- Migrar para Managed Agents em produção apenas quando saírem de Pre-GA

#### ❌ Gemini Enterprise Agent Platform (Enterprise) — **AVALIAR FUTURAMENTE**

**Quando considerar:**
- Quando o CapIAu-CurIA for adotado por uma organização com compliance rigoroso
- Necessidade de DLP (Data Loss Prevention), governança centralizada, audit logs
- Multi-team com políticas organizacionais

**Por que não agora:**
- Requer contrato Enterprise com Google Cloud
- Adiciona complexidade de governança desnecessária para uso individual/small team
- Custos não públicos (enterprise pricing)

### 7.5 Resumo da Análise: Gemini Enterprise Agent Platform no CapIAu-CurIA

| Recurso | Aproveitar? | Prioridade | Custo | Risco |
|---------|-------------|------------|-------|-------|
| **Data Stores customizados** | ✅ **SIM — Fortemente** | Alta | Storage GCP (baixo) | Baixo |
| **Grounding Google Search** | ⚠️ **Com moderação** | Média | $14–$35/1K queries | Alto (imprevisível) |
| **Antigravity (Deep Research)** | ⚠️ **Experimentação** | Média | Custo modelo + execução | Médio (Pre-GA) |
| **Managed Agents customizados** | ⚠️ **Experimentação** | Baixa | Custo modelo + sandbox | Médio (Pre-GA) |
| **Enterprise Platform** | ❌ **Não agora** | — | Enterprise (não público) | — |

---

## 8. Modelos LLM (OpenRouter + Gemini)

### 8.1 OpenRouter — Tier Free

| Modelo | Melhor para | Contexto | Daily Cap |
|--------|-------------|----------|-----------|
| `deepseek/deepseek-r1:free` | Raciocínio complexo, análise de reviews | 64K | 1.000* |
| `meta-llama/llama-4-maverick:free` | Processar múltiplos reviews longos | 1M | 1.000* |
| `qwen/qwen3-235b-a22b:free` | Extrair JSON estruturado | 128K | 1.000* |
| `mistralai/mistral-small-3.1-24b-instruct:free` | Resumos em português | 128K | 1.000* |
| `google/gemma-3-27b-it:free` | Tarefas leves, fallback | 128K | 1.000* |

> *Com $10 de crédito na conta OpenRouter.

### 8.2 OpenRouter — Tier Pago (Baixo Custo)

| Modelo | Custo | Melhor para |
|--------|-------|-------------|
| `anthropic/claude-3.5-haiku` | ~$0,80/1M tokens | Respostas rápidas, baixa latência |
| `google/gemini-2.5-flash` | ~$0,15/1M tokens | Custo mínimo, alta velocidade |
| `openai/gpt-4o-mini` | ~$0,60/1M tokens | Qualidade média, preço baixo |

### 8.3 Gemini (Google Cloud) — Tier Cloud

| Modelo | Custo | Melhor para | Grounding Free? |
|--------|-------|-------------|-----------------|
| `gemini-3.5-flash` | $0,25/1M input | Alta velocidade, custo mínimo | 5.000 prompts/mês |
| `gemini-2.5-pro` | $1,25–$2,50/1M input | Raciocínio complexo, coding | 1.500 RPD |
| `gemini-2.5-flash` | $0,50/1M input | Equilíbrio custo-benefício | 1.500 RPD |
| `gemini-2.0-flash` | $0,10/1M input | Tarefas simples, alta throughput | 500 RPD |

---

## 9. Modos de Pesquisa — Workflows Completos (Atualizados com Fóruns)

### Modo A: Busca por Nome/Modelo
**Input:** "Sony FX6"

```
CAMADA 2 (Orquestrador):
  → Classifica intent: product_name
  → Seleciona APIs: Serper (primária), Exa (semântica), TMDb (setor)
  → Se Data Store Gemini ativo: consulta também base de conhecimento própria

CAMADA 3 (Busca Web + Fóruns):
  1. Serper.dev → "Sony FX6" → 10 resultados Google
  2. Exa → "Sony FX6" → descoberta semântica
  3. TMDb → search/movie → filmes que usam FX6
  4. Reddit API → r/cinematography/search.json?q=Sony+FX6
     → Threads de discussão, opiniões da comunidade
  5. Reddit API → r/filmmakers/search.json?q=Sony+FX6+review
     → Reviews de usuários, experiências reais

CAMADA 4 (Extração Estruturada):
  6. Tavily → extrai conteúdo dos 3 links mais relevantes do Serper
  7. Diffbot → extrai review do B&H Photo (1 crédito)
     → JSON estruturado: specs, preço, descrição
  8. Firecrawl → extrai review do Cinema5D (1 crédito)
     → Markdown limpo para LLM
  9. DataForSEO (pago) ou SerpAPI (limitado) → Google Shopping
     → preços em tempo real se free tier esgotado
  10. Gemini Data Store (se ativo) → consulta manuais/reviews/fóruns indexados

CAMADA 5 (Inteligência — OpenRouter):
  11. Qwen3 free → extrai entidades: specs, alertas, compatibilidade
  12. DeepSeek R1 free → detecta anomalias (preço suspeito, recall)
  13. Mistral Small free → gera resposta em português

OUTPUT:
  → Ficha técnica consolidada
  → Faixa de preço (novo/usado) + histórico Keepa (se pago)
  → 3 reviews profissionais resumidos (Cinema5D, B&H, etc.)
  → 3 opiniões da comunidade (Reddit, fóruns)
  → 3 alternativas similares com justificativa técnica
  → Alertas de firmware/manutenção
  → Dados do Data Store Gemini (se disponível)
  → Score de recomendação (0–100)
```

### Modo B: Busca por Função/Categoria
**Input:** "câmera para documentário noturno baixo orçamento"

```
CAMADA 2:
  → Classifica intent: function_category
  → Seleciona APIs: Exa (primária), Serper (comparativos), Reddit (opiniões)
  → Se Data Store Gemini ativo: consulta categoria "documentary cameras"

CAMADA 3:
  1. Exa → busca semântica pura
     → Encontra por conceito: low-light, documentary, budget, cinematic
  2. Serper → "best low light documentary camera 2026 budget"
     → Comparativos, listas, reviews coletivos
  3. Reddit API → r/cinematography/search.json?q=low+light+documentary+camera
     → Opiniões de DPs sobre câmeras para noturno
  4. Reddit API → r/filmmakers/search.json?q=best+camera+night+shooting
     → Experiências reais de produção noturna

CAMADA 4:
  5. Tavily → extrai 3 comparativos "top 10"
     → Cria matriz: ISO, peso, preço, bateria, codecs
  6. DataForSEO Merchant → preços atuais de cada modelo listado
  7. Diffbot → extrai review do RTINGS (1 crédito)
     → Testes técnicos de low-light performance
  8. Gemini Data Store → consulta reviews indexados de câmeras documentais

CAMADA 5:
  9. Llama 4 Maverick free → síntese de múltiplos reviews
     → Ranking ponderado por: low-light score, peso, preço, bateria
  10. Mistral Small free → gera "kit mínimo" por opção
  11. Mistral Small free → resume opiniões da comunidade em português

OUTPUT:
  → Ranking top 5 com justificativa técnica
  → Matriz comparativa visual
  → Orçamento estimado por opção (corpo + essenciais)
  → Links para reviews em vídeo (YouTube via SerpAPI)
  → Opiniões da comunidade (Reddit, fóruns) resumidas
  → Insights do Data Store Gemini (se disponível)
```

### Modo C: Busca por Serial/Número de Lote
**Input:** "Sony FX3 serial 4478021"

```
CAMADA 2:
  → Classifica intent: serial_lookup
  → Seleciona APIs: Serper (fóruns), Tavily (decodificação), Reddit (experiências)

CAMADA 3:
  1. Serper → "Sony FX3 serial number 4478021"
     → Fóruns de verificação de serial, databases de serial
  2. Serper → "Sony FX3 lot 4478 firmware issues"
     → Problemas conhecidos do lote
  3. Exa → "FX3 first batch problems"
     → Discussões sobre unidades iniciais (semântica)
  4. Reddit API → r/cinematography/search.json?q=FX3+serial+4478
     → Experiências de usuários com esse lote específico

CAMADA 4:
  5. Tavily → extrai guia de decodificação de serial Sony
     → Data de fabricação estimada
  6. Keepa (pago) → "Sony FX3" → valor de mercado atual
     → Histórico de preço para cálculo de depreciação
  7. Gemini Data Store → consulta registros de manutenção indexados (se houver)

CAMADA 5:
  8. DeepSeek R1 free → analisa lote + data de fabricação
     → Alerta se unidade pertence a lote com defeito conhecido
  9. Qwen3 free → gera JSON: serial, lote, data, alertas, valor

OUTPUT:
  → Data de fabricação estimada
  → Lote/faixa de serial
  → Alertas de recalls/firmware para esse período
  → Valor de mercado atual (novo/usado) + depreciação
  → Experiências da comunidade com esse lote
  → Status de verificação
```

### Modo D: Busca por Imagem (Reverse Image Search)
**Input:** Upload de foto de equipamento desconhecido

```
CAMADA 2:
  → Classifica intent: image_search
  → Seleciona APIs: SerpAPI Google Lens (limitado) ou Gemini Vision (pago)
     → Se não houver budget: Serper + descrição manual

CAMADA 3:
  1. SerpAPI → Google Lens (250 free/mês, usar com parcimônia)
     → Identifica modelo a partir da imagem
  2. Serper → "identify [modelo] cinema equipment"
     → Confirmação e contexto

CAMADA 4:
  3. Tavily → extrai página oficial do fabricante
     → Especificações completas
  4. Exa → "equipment similar to [modelo]"
     → Alternativas compatíveis
  5. Reddit API → r/filmmakergear/search.json?q=[modelo]
     → Discussões sobre o equipamento identificado

CAMADA 5:
  6. Qwen3 free → consolida identificação + specs + similares

OUTPUT:
  → Identificação do equipamento com confiança %
  → Especificações técnicas
  → Preço estimado
  → Equipamentos similares/compatíveis
  → Opiniões da comunidade
```

### Modo E: Comparativo de Preços (Price Hunter)
**Input:** Equipamento selecionado → melhor preço

```
CAMADA 2:
  → Classifica intent: price_comparison
  → Seleciona APIs: DataForSEO (primária paga), SerpAPI (fallback)
  → NÃO usar Gemini Grounding (muito caro para busca de preços)

CAMADA 3:
  1. DataForSEO Merchant → Google Shopping + Amazon + eBay
     → $0,001/task (Standard) — 15x mais barato que SerpAPI
  2. Serper → "Sony FX6 coupon discount 2026"
     → Cupons de desconto ativos

CAMADA 4:
  3. Tavily → extrai política de garantia de cada loja
     → "B&H: 1 ano | Amazon: 30 dias | eBay: varia"
  4. Keepa (pago) → histórico de preço FX6
     → Gráfico de desvalorização ao longo do tempo

CAMADA 5:
  5. DeepSeek R1 free → detecta anomalias de preço
     → "Preço $1.200 no eBay = 40% abaixo da média. Possível golpe."
  6. Mistral Small free → gera tabela comparativa em português

OUTPUT:
  → Tabela: Loja | Preço | Condição | Garantia | Frete | Total
  → Destaque "melhor custo-benefício" e "menor risco"
  → Alerta de preço suspeito com justificativa
  → Histórico de preço (se Keepa ativo)
  → Link direto para compra (com token de afiliado se aplicável)
```

### Modo F: Troubleshooting & Manutenção
**Input:** "FX6 travando em 4K 120fps"

```
CAMADA 2:
  → Classifica intent: troubleshoot
  → Seleciona APIs: Exa (semântica), Serper (fóruns), Firecrawl (scraping)
  → Reddit API (threads de solução)
  → Se Data Store Gemini ativo: consulta base de troubleshooting indexada

CAMADA 3:
  1. Exa → "FX6 freezing 4K 120fps"
     → Busca semântica pura (encontra mesmo sem palavras exatas)
  2. Serper → "Sony FX6 4K 120fps freeze problem"
     → Fóruns, Reddit, Sony support
  3. Reddit API → r/cinematography/search.json?q=FX6+freezing+4K+120fps
     → Threads de usuários com o mesmo problema
  4. Reddit API → r/filmmakers/search.json?q=FX6+troubleshoot
     → Soluções encontradas pela comunidade
  5. Firecrawl → scrape de threads técnicas específicas
     → Conversão para Markdown limpo para LLM

CAMADA 4:
  6. Tavily → extrai 3 melhores threads de solução
     → Causas: card lento, firmware bug, temperatura, config
  7. Serper → "Sony FX6 firmware 5.0 4K 120fps fix"
     → Verifica se há correção em firmware novo
  8. Gemini Data Store → consulta manuais de serviço indexados

CAMADA 5:
  9. DeepSeek R1 free → diagnóstico provável com % de confiança
     → "Causa 1: Overheating (45%) | Causa 2: Card CFexpress lento (30%) | Causa 3: Firmware bug (25%)"
  10. Mistral Small free → soluções ordenadas por complexidade
     → Fácil → Médio → Difícil (envio para assistência)
  11. Mistral Small free → resume soluções da comunidade (Reddit)

OUTPUT:
  → 3 causas prováveis com % de confiança
  → Soluções passo a passo ordenadas por complexidade
  → Links para tutoriais em vídeo (YouTube)
  → Alerta de recall/firmware se aplicável
  → Soluções encontradas pela comunidade (Reddit, fóruns)
  → Dados do Data Store Gemini (manuais, guias técnicos)
  → Se problema conhecido de lote: alerta para outros equipamentos do acervo
```

### Modo G: Compatibilidade & Rig Builder
**Input:** "Tenho FX6, quero montar rig documental"

```
CAMADA 2:
  → Classifica intent: compatibility_check
  → Seleciona APIs: Serper (acessórios), Exa (setups reais), Reddit (experiências)

CAMADA 3:
  1. Serper → "SmallRig cage Sony FX6 compatible accessories"
     → Lista de produtos compatíveis e conflitos
  2. Exa → "lightweight rig FX6 documentary run and gun"
     → Setups reais documentados por semântica
  3. Reddit API → r/filmmakergear/search.json?q=FX6+rig+documentary
     → Setups reais compartilhados pela comunidade
  4. Reddit API → r/cinematography/search.json?q=FX6+cage+compatibility
     → Experiências de compatibilidade física

CAMADA 4:
  5. Tavily → extrai reviews de compatibilidade
     → "A cage da Tilta não encaixa com a baseplate da SmallRig"
  6. DataForSEO → preços dos acessórios compatíveis
  7. Firecrawl → scrape de guias de montagem com fotos

CAMADA 5:
  8. Qwen3 free → gera diagrama de compatibilidade (JSON)
     → O que encaixa no quê, o que conflita
  9. Mistral Small free → orçamento do rig completo em português

OUTPUT:
  → Lista de acessórios compatíveis com links de compra
  → Diagrama de compatibilidade (texto/estruturado)
  → Alertas de incompatibilidade física conhecidos
  → Setups reais compartilhados pela comunidade (Reddit)
  → Orçamento do rig completo (corpo + acessórios)
  → Peso total estimado do setup
```

### Modo H: Descoberta de Lançamentos & Tendências
**Input:** "O que está saindo de novo em 2026?"

```
CAMADA 2:
  → Classifica intent: trend_discovery
  → Seleciona APIs: Serper (agendado), Exa (tendências), Reddit (buzz)
  → Se Antigravity ativo: pode agendar pesquisa profunda automatizada

CAMADA 3:
  1. Serper (agendado/diário) → "new cinema camera announced 2026"
     → NAB 2026, IBC, press releases
  2. Exa → "future of documentary camera technology 2026"
     → Tendências e análises preditivas por semântica
  3. Scrape.do → scrape de sites de notícias especializados
     → Cinema5D, NewsShooter, NoFilmSchool, 43rumors
  4. Reddit API → r/cinematography/search.json?q=new+camera+2026
     → Buzz da comunidade sobre lançamentos
  5. Reddit API → r/filmmakers/search.json?q=NAB+2026
     → Reações e análises de filmmakers sobre novidades

CAMADA 4:
  6. Tavily → extrai press releases e hands-on de novos lançamentos
  7. TMDb → filmes recentes com equipamentos novos
  8. Gemini Data Store → consulta catálogo de lançamentos indexados

CAMADA 5:
  9. Llama 4 Maverick free → síntese de múltiplas fontes
     → Timeline de lançamentos com relevância
  10. Gemini Grounding (se ativo e dentro do free tier) → valida informações
     com Google Search para confirmar datas e preços
  11. Mistral Small free → timeline de lançamentos + recomendação
     → "Relevante para você" baseado em histórico de busca

OUTPUT:
  → Timeline de lançamentos (cards com data, marca, modelo)
  → Resumo de hands-on e primeiras impressões
  → Preço estimado e disponibilidade
  → Reações da comunidade (Reddit, fóruns)
  → "Deve esperar ou comprar agora?" (análise de custo-benefício)
  → Alerta de pre-order com links
```

---

## 10. Estratégia de Cache Avançada

### Política de TTL por Tipo de Dado

| Tipo de Dado | API | TTL | Justificativa |
|--------------|-----|-----|---------------|
| Especificações técnicas | Tavily | 30 dias | Specs estáveis |
| Preços | DataForSEO/SerpAPI | 6 horas | Preços mudam diariamente |
| Reviews profissionais | Serper/Tavily | 14 dias | Acumulam-se, mas novos aparecem |
| Reviews de comunidade (Reddit) | Reddit API | 7 dias | Threads são dinâmicas |
| Threads de fóruns | Diffbot | 7 dias | Conteúdo pode ser atualizado |
| Disponibilidade estoque | DataForSEO | 2 horas | Stock volátil |
| Firmware/manuais | Serper | 7 dias | Atualizações esporádicas |
| Metadados TMDb | TMDb | 30 dias | Dados estáveis |
| Respostas LLM | OpenRouter | 1 dia | Contexto muda |
| Resultados de busca | Serper | 7 dias | Balanceamento frescor/custo |
| Data Store Gemini | Gemini | 1 dia | Dados próprios podem ser atualizados |

### Cache Hierárquico

```
L1: Memory (Node.js Map) → TTL 1 hora, máximo 100 entradas
L2: SQLite local → TTL conforme tabela, máximo 10MB
L3: IndexedDB (Dexie.js no frontend) → TTL 7 dias, para offline
L4: Gemini Data Store (se ativo) → consulta direta, sem cache local
```

---

## 11. Circuit Breaker e Fallbacks (Atualizado com Rotação)

### Estratégia de Resiliência + Rotação

```
Para cada modo de busca, definir uma cadeia de fallback + rotação:

Exemplo: Troubleshooting (Modo F)

1. Reddit API (nativa, ilimitada)
   → Busca threads de solução na comunidade
   → Falha (timeout, 429, 500)?
   → Circuit breaker abre por 60 segundos

2. Exa (free, 1.000/mês)
   → Busca semântica de soluções
   → Falha?
   → Circuit breaker abre

3. Serper.dev (free, 2.500/mês)
   → Busca Google de fóruns técnicos
   → Falha?
   → Circuit breaker abre

4. Diffbot (free, 10.000/mês)
   → Extrai threads de fóruns específicos (Cinematography.com, DVXUser)
   → Falha?
   → Circuit breaker abre

5. Firecrawl (free, 1.000/mês)
   → Scraping de threads técnicas
   → Falha?
   → Circuit breaker abre

6. Scrape.do (free, 1.000/mês)
   → Fallback para sites protegidos
   → Falha?
   → Circuit breaker abre

7. Gemini Data Store (se ativo)
   → Consulta base de troubleshooting indexada
   → Falha?
   → Circuit breaker abre

8. Resposta degradada: usar cache mais antigo possível
   → Se cache miss: retornar erro técnico claro
     (Zero simulação — conforme diretriz CapIAu-CurIA)
```

### Tabela de Fallbacks por Modo (Atualizada)

| Modo | Primária | Fallback 1 | Fallback 2 | Fallback 3 | Fallback 4 | Fallback 5 | Degradada |
|------|----------|-----------|-----------|-----------|-----------|-----------|-----------|
| A (Nome) | Serper | Reddit API | Exa | Tavily | Diffbot | Gemini DS* | Cache |
| B (Função) | Exa | Reddit API | Serper | Scrape.do | Tavily | Gemini DS* | Cache |
| C (Serial) | Serper | Reddit API | Tavily | Diffbot | — | — | Cache |
| D (Imagem) | SerpAPI Lens | Serper | Reddit API | — | — | — | "Não identificado" |
| E (Preços) | DataForSEO | SerpAPI | Serper | ScrapingBee | — | — | Cache |
| F (Troubleshoot) | Reddit API | Exa | Serper | Diffbot | Firecrawl | Gemini DS* | Cache |
| G (Rig) | Reddit API | Serper | Exa | Tavily | Diffbot | — | Cache |
| H (Trends) | Serper | Reddit API | Scrape.do | Exa | Gemini Grounding** | — | Cache |

> *Gemini DS: Gemini Data Store (se houver data store configurado)  
> **Gemini Grounding: só usar se ativo E dentro do free tier (5.000 prompts/mês ou 1.500 RPD)

---

## 12. Tokenização de Links (Anti-Alucinação)

Conforme diretriz **CapIAu-CurIA Seção C**:

```
1. APIs de busca (Serper, Tavily, Scrape.do, Diffbot) coletam links reais
2. Orquestrador substitui URLs por tokens: LINK_0, LINK_1, THUMB_0...
3. JSON com tokens é enviado ao LLM (OpenRouter ou Gemini)
4. LLM processa e retorna texto com tokens
5. Orquestrador substitui tokens de volta pelas URLs originais
6. Frontend recebe apenas URLs válidas e verificadas

Regra de segurança:
- Nenhum link começando com "localhost", "127.0.0.1", "file://"
  passa da tokenização. São descartados imediatamente.
- Links de imagem são validados com HEAD request (200 OK + content-type)
  antes de serem apresentados ao usuário.
- Links do Gemini Grounding são validados contra a lista de URLs
  coletadas na etapa de busca (evita alucinação do Google Search).
- Links de fóruns (Reddit, Cinematography.com) são validados para
  garantir que apontam para threads reais e não páginas de erro.
```

---

## 13. Timeouts e Limites de Execução

Conforme diretriz **CapIAu-CurIA Seção B**:

| Camada | Timeout | AbortController |
|--------|---------|---------------|
| Proxy backend (Node.js) | 45 segundos | Sim |
| Frontend (React) | 35 segundos | Sim |
| API individual (Serper, Tavily) | 10 segundos | Sim |
| API de scraping (Diffbot, Firecrawl, Scrape.do) | 15 segundos | Sim |
| API de scraping pesado (Bright Data, Zyte) | 20 segundos | Sim |
| Reddit API | 10 segundos | Sim |
| LLM (OpenRouter) | 25 segundos | Sim |
| Gemini Grounding | 30 segundos | Sim |
| Gemini Data Store | 20 segundos | Sim |
| Antigravity | 120 segundos | Sim |
| Cache SQLite | 2 segundos | Não (síncrono) |

---

## 14. Configuração Completa

### 14.1 config.yaml

```yaml
project:
  name: "CapIAu-CurIA"
  version: "3.1.0"
  environment: "development" # development | staging | production

apis:
  # === TIER FREE — BUSCA WEB ===
  serper:
    key: "${SERPER_API_KEY}"
    tier: "free"
    monthly_limit: 2500
    timeout_ms: 10000
    cache_ttl_hours: 168
    enabled: true
    priority: 1

  tavily:
    key: "${TAVILY_API_KEY}"
    tier: "free"
    monthly_limit: 1000
    timeout_ms: 10000
    cache_ttl_hours: 336
    enabled: true
    priority: 2

  exa:
    key: "${EXA_API_KEY}"
    tier: "free"
    monthly_limit: 1000
    initial_credits: 10
    timeout_ms: 10000
    cache_ttl_hours: 720
    enabled: true
    priority: 3

  # === TIER FREE — FÓRUNS E COMUNIDADES ===
  reddit:
    client_id: "${REDDIT_CLIENT_ID}"
    client_secret: "${REDDIT_CLIENT_SECRET}"
    user_agent: "CapIAu-CurIA/3.1 (by /u/seuusuario)"
    tier: "free"
    rate_limit: "60req/min"
    timeout_ms: 10000
    cache_ttl_hours: 168
    enabled: true
    priority: 0 # sempre disponível, ilimitado com OAuth
    subreddits:
      - cinematography
      - filmmakers
      - filmmakergear
      - videography
      - photography

  diffbot:
    key: "${DIFFBOT_API_KEY}"
    tier: "free"
    monthly_limit: 10000
    rate_limit: "5calls/min"
    timeout_ms: 15000
    cache_ttl_hours: 168
    enabled: true
    priority: 4

  firecrawl:
    key: "${FIRECRAWL_API_KEY}"
    tier: "free"
    monthly_limit: 1000
    timeout_ms: 15000
    cache_ttl_hours: 336
    enabled: true
    priority: 5

  scrape_do:
    key: "${SCRAPE_DO_API_KEY}"
    tier: "free"
    monthly_limit: 1000
    timeout_ms: 15000
    cache_ttl_hours: 168
    enabled: true
    priority: 6
    policy: "only_pay_on_success" # requests falhos = grátis

  scraperapi:
    key: "${SCRAPERAPI_API_KEY}"
    tier: "free"
    monthly_limit: 1000
    trial_credits: 5000
    trial_days: 7
    timeout_ms: 15000
    cache_ttl_hours: 168
    enabled: true
    priority: 7
    warning: "Evitar Google (25x) e Amazon (5x). Use apenas sites simples."

  apify:
    key: "${APIFY_API_KEY}"
    tier: "free"
    monthly_credits: 5
    timeout_ms: 20000
    cache_ttl_hours: 168
    enabled: true
    priority: 8

  hasdata:
    key: "${HASDATA_API_KEY}"
    tier: "free"
    initial_credits: 1000
    daily_refill: 100 # quando saldo < 100
    timeout_ms: 15000
    cache_ttl_hours: 168
    enabled: true
    priority: 9

  # === TIER FREE — SETOR AUDIOVISUAL ===
  tmdb:
    key: "${TMDB_API_KEY}"
    tier: "free"
    rate_limit: "40req/10s"
    timeout_ms: 5000
    cache_ttl_hours: 720
    enabled: true
    priority: 10

  omdb:
    key: "${OMDB_API_KEY}"
    tier: "free"
    timeout_ms: 5000
    cache_ttl_hours: 720
    enabled: true
    priority: 11

  # === TIER FREE — LLM ===
  openrouter:
    key: "${OPENROUTER_API_KEY}"
    tier: "free"
    credit_balance: 10.00
    daily_limit: 1000
    timeout_ms: 25000
    models:
      reasoning: "deepseek/deepseek-r1:free"
      synthesis: "meta-llama/llama-4-maverick:free"
      extraction: "qwen/qwen3-235b-a22b:free"
      writing: "mistralai/mistral-small-3.1-24b-instruct:free"
      fallback: "google/gemma-3-27b-it:free"
      paid_fast: "google/gemini-2.5-flash"
    enabled: true
    priority: 0

  # === TIER PAGO (opcional) ===
  dataforseo:
    key: "${DATAFORSEO_API_KEY}"
    tier: "paid"
    cost_per_1k_standard: 1.00
    cost_per_1k_priority: 2.00
    timeout_ms: 45000
    cache_ttl_hours: 6
    enabled: false
    priority: 20

  scrape_do_paid:
    key: "${SCRAPE_DO_PAID_API_KEY}"
    tier: "paid"
    monthly_cost: 29.00
    requests_included: 250000
    timeout_ms: 20000
    cache_ttl_hours: 24
    enabled: false
    priority: 21

  scrapingbee:
    key: "${SCRAPINGBEE_API_KEY}"
    tier: "paid"
    monthly_cost: 49.00
    credits_included: 250000
    timeout_ms: 20000
    cache_ttl_hours: 24
    enabled: false
    priority: 22

  brightdata:
    key: "${BRIGHTDATA_API_KEY}"
    tier: "paid"
    cost_per_1k: 0.75
    timeout_ms: 20000
    cache_ttl_hours: 24
    enabled: false
    priority: 23

  keepa:
    key: "${KEEPA_API_KEY}"
    tier: "paid"
    timeout_ms: 10000
    cache_ttl_hours: 168
    enabled: false
    priority: 24

  zyte:
    key: "${ZYTE_API_KEY}"
    tier: "paid"
    cost_per_1k_http: 0.13
    cost_per_1k_browser: 1.27
    trial_credits: 5.00
    trial_days: 30
    timeout_ms: 20000
    cache_ttl_hours: 24
    enabled: false
    priority: 25

  serpapi:
    key: "${SERPAPI_API_KEY}"
    tier: "paid"
    monthly_cost: 75.00
    searches_included: 5000
    timeout_ms: 10000
    cache_ttl_hours: 6
    enabled: false
    priority: 26

  # === TIER GOOGLE CLOUD (opcional) ===
  gemini_grounding:
    key: "${GOOGLE_CLOUD_API_KEY}"
    project_id: "${GCP_PROJECT_ID}"
    tier: "cloud"
    model: "gemini-3.5-flash"
    free_tier_prompts_per_month: 5000
    cost_per_1k_queries: 14.00
    timeout_ms: 30000
    cache_ttl_hours: 24
    enabled: false
    priority: 30
    usage_cap_monthly_usd: 50.00

  gemini_data_store:
    key: "${GOOGLE_CLOUD_API_KEY}"
    project_id: "${GCP_PROJECT_ID}"
    tier: "cloud"
    data_store_id: "${GEMINI_DATA_STORE_ID}"
    timeout_ms: 20000
    cache_ttl_hours: 24
    enabled: false
    priority: 31
    sources_to_index:
      - manuais_tecnicos
      - reviews_sites
      - forums_indexed
      - press_releases
      - catalogs_locadoras

  antigravity:
    key: "${GOOGLE_CLOUD_API_KEY}"
    project_id: "${GCP_PROJECT_ID}"
    tier: "cloud"
    agent_id: "antigravity-preview-05-2026"
    timeout_ms: 120000
    enabled: false
    priority: 32
    warning: "Pre-GA: Não usar para dados confidenciais ou produção comercial"

cache:
  l1_memory:
    max_entries: 100
    ttl_minutes: 60
  l2_sqlite:
    path: "./cache/capiau_curia.db"
    max_size_mb: 100
    compression: true
  l3_indexeddb:
    name: "CapIAuCurIA_Cache"
    version: 1
    ttl_days: 7

circuit_breaker:
  failure_threshold: 3
  recovery_timeout_seconds: 60
  half_open_max_calls: 1

timeouts:
  proxy_backend: 45000
  frontend_chat: 35000
  api_individual: 10000
  api_scraping: 15000
  api_scraping_heavy: 20000
  reddit_api: 10000
  llm: 25000
  gemini_grounding: 30000
  gemini_data_store: 20000
  antigravity: 120000
  cache_sqlite: 2000

tokenization:
  enabled: true
  token_prefix: "LINK_"
  thumb_prefix: "THUMB_"
  blocked_prefixes:
    - "localhost"
    - "127.0.0.1"
    - "file://"
    - "0.0.0.0"
  validate_images: true
  validate_forum_links: true

features:
  - product_search
  - category_search
  - serial_lookup
  - image_search
  - price_comparison
  - troubleshooting
  - compatibility_check
  - trend_discovery
  - forum_search # NOVO: busca em fóruns e comunidades
  - community_sentiment # NOVO: análise de sentimento da comunidade
  - gemini_data_store
  - antigravity_deep_research

export:
  capiau:
    enabled: false
    endpoint: "http://localhost:8000/acervo/import"
    format: "json"
    auth_token: "${CAPIAU_TOKEN}"
```

### 14.2 .env

```bash
# === TIER FREE — BUSCA WEB ===
SERPER_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
EXA_API_KEY=exa-...

# === TIER FREE — FÓRUNS E COMUNIDADES ===
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
DIFFBOT_API_KEY=...
FIRECRAWL_API_KEY=fc-...
SCRAPE_DO_API_KEY=...
SCRAPERAPI_API_KEY=...
APIFY_API_KEY=...
HASDATA_API_KEY=...

# === TIER FREE — SETOR AUDIOVISUAL ===
TMDB_API_KEY=...
OMDB_API_KEY=...

# === TIER FREE — LLM ===
OPENROUTER_API_KEY=sk-or-v1-...

# === TIER PAGO (ativar conforme necessidade) ===
DATAFORSEO_API_KEY=...
SCRAPE_DO_PAID_API_KEY=...
SCRAPINGBEE_API_KEY=...
BRIGHTDATA_API_KEY=...
KEEPA_API_KEY=...
ZYTE_API_KEY=...
SERPAPI_API_KEY=...

# === TIER GOOGLE CLOUD (ativar conforme necessidade) ===
GOOGLE_CLOUD_API_KEY=...
GCP_PROJECT_ID=...
GEMINI_DATA_STORE_ID=...

# === CAPIAu ===
CAPIAU_TOKEN=...
```

---

## 15. Roadmap de Evolução e Custos

### Fase 1: MVP — Zero Custo (Hoje)
**Stack:** Serper + Tavily + Exa + Reddit API + Diffbot + Firecrawl + Scrape.do + ScraperAPI + Apify + HasData + TMDb + OMDb + OpenRouter free  
**Capacidade:** ~15.000–52.000 consultas/mês com cache e rotação  
**Custo:** **$0**

### Fase 2: Escalabilidade Inicial (Mês 2–3)
**Adicionar:** DataForSEO ($1–$2/1K tasks) + Scrape.do pago ($29/mês)  
**Motivo:** Volume cresceu, free tiers esgotando. Necessidade de scraping de fóruns protegidos.  
**Capacidade:** ~150.000 consultas/mês  
**Custo estimado:** **$30–$50/mês**

### Fase 3: Dados Enriquecidos + Fóruns Indexados (Mês 4–6)
**Adicionar:** Keepa (histórico de preços) + ScrapingBee ($49/mês)  
**Adicionar:** Gemini Data Store (storage GCP + indexação de manuais, reviews, fóruns)  
**Motivo:** Precisa de dados de depreciação, valor residual, e base de conhecimento própria do setor com fóruns indexados.  
**Capacidade:** ~500.000 consultas/mês + grounding com dados próprios  
**Custo estimado:** **$80–$150/mês** (incluindo storage GCP)

### Fase 4: Enterprise + Deep Research (Mês 7+)
**Adicionar:** Bright Data ($0,75/1K) + Diffbot pago ($299/mês) + Zyte (PAYG) + OpenRouter pago  
**Adicionar:** Gemini Grounding (com cap de $50/mês) + Antigravity (experimental)  
**Motivo:** Volume > 1M requests/mês, necessidade de 99%+ uptime, pesquisa profunda automatizada de equipamentos.  
**Capacidade:** Ilimitada (escala horizontal) + Deep Research automatizado  
**Custo estimado:** **$400–$900/mês**

### Fase 5: Integração CapIAu
**Adicionar:** Exportação automática para módulo Acervo do CapIAu  
**Custo:** **$0** (custo interno de infraestrutura)

---

## 16. Comparativo de Custo por 1.000 Consultas

| Provider | Custo/1K | Free Tier | Melhor para | Quando usar |
|----------|----------|-----------|-------------|-------------|
| Reddit API | $0 | Ilimitado (OAuth) | Fóruns, discussões, opiniões | Sempre (primária para comunidade) |
| Diffbot | $0 | 10.000/mês | Fóruns sem API, reviews estruturados | Quando não há API nativa |
| Firecrawl | $0 | 1.000/mês | Sites de review em Markdown | Alimentar pipeline LLM |
| Scrape.do | $0 | 1.000/mês | Fallback de sites protegidos | Quando Diffbot/Firecrawl falham |
| ScraperAPI | $0 | 1.000/mês | Sites simples estáticos | Evitar Google/Amazon (multiplicadores) |
| Apify | $0 | $5/mês | Actors de scraping | Scrapers customizados |
| HasData | $0 | 1.000 + 100/dia | Requests sem multiplicadores | Fallback de emergência |
| Serper.dev | $0,30 | 2.500/mês | Busca Google pura | Sempre (primária para web) |
| DataForSEO | $1,00 | Não | Batch, Google Shopping | Volume > 5K/mês |
| Zyte | $0,13–$1,27 | $5 trial | Scraping HTTP/browser | Sites com proteção básica |
| Bright Data | $0,75 | 1K trial | Enterprise | Volume > 500K/mês |
| SerpAPI | $15,00 | 250/mês | Multi-engine | Casos específicos |
| Tavily | $5,00 | 1.000/mês | RAG | Extração de reviews |
| Exa | $7,00 | 1.000/mês | Busca semântica | Descoberta de referências |
| **Gemini Grounding** | **$14–$35** | 5.000/mês | Síntese com citações | **Com moderação** |
| OpenRouter | Pay-as-you-go | 1.000/dia | LLM agregador | Sempre |

---

## 17. Considerações de Compliance e Risco

### Scraping Ético
- Sempre respeitar `robots.txt` dos sites alvo.
- Adicionar delay de 2–5 segundos entre requests para o mesmo domínio.
- Usar User-Agent identificável: `CapIAu-CurIA-Bot/3.1 (contact@seusite.com)`.
- Para sites de equipamentos audiovisuais (B&H, Adorama, etc.), verificar Termos de Serviço antes de scraping direto.
- Para fóruns (Cinematography.com, DVXUser), respeitar políticas de uso e não sobrecarregar servidores.

### Dados Pessoais
- Não armazenar dados de usuários do Reddit (usernames, histórico) sem necessidade.
- Anonimizar dados de reviews quando possível.
- Respeitar GDPR/LGPD para dados de usuários europeus/brasileiros.

### Afiliados
- Se usar links de afiliados (Amazon Associates, B&H Affiliate), declarar explicitamente na interface.
- Amazon PA-API está deprecated — migrar para Creators API ou usar DataForSEO/Scraping.

### Google Cloud
- Gemini Grounding: configurar **hard cap de gasto** ($50/mês) no GCP para evitar surpresas de billing.
- Antigravity: não processar dados confidenciais (status Pre-GA).
- Data Stores: garantir que documentos indexados não violem copyright (manuais oficiais são públicos; reviews exigem atribuição; fóruns são públicos mas respeitar ToS).

---

## 18. Interface de Exportação para CapIAu

```json
// POST /capiau/acervo/import
{
  "source": "capiau-curia",
  "timestamp": "2026-06-09T14:00:00Z",
  "equipment": {
    "id": "sony-fx6-2026",
    "name": "Sony FX6",
    "manufacturer": "Sony",
    "category": "camera",
    "model": "ILME-FX6",
    "specs": {
      "sensor": "Full Frame 10.2MP",
      "weight_g": "890",
      "codecs": "XAVC-I, XAVC-L",
      "max_resolution": "4K 120fps",
      "iso_range": "80-102400",
      "nd_filter": "Built-in electronic ND"
    },
    "prices": [
      {
        "store": "B&H Photo",
        "price": "$2,498",
        "condition": "New",
        "shipping": "Free",
        "warranty": "1 year",
        "totalPrice": "$2,498",
        "isBestDeal": true,
        "isLowRisk": true,
        "link": "https://www.bhphotovideo.com/...",
        "thumbnail": "https://..."
      }
    ],
    "dossier": {
      "summary": "Câmera cinema full-frame compacta, ideal para documentário...",
      "pros": ["ISO 12800 limpo", "Autofoco em -6EV", "Bateria 4h"],
      "cons": ["Menu confuso", "Overheating 4K 120fps"],
      "recommendationScore": 87,
      "bestFor": ["documentary", "low_light", "run_and_gun"],
      "avoidFor": ["studio_interview_long_takes", "4k_120fps_extended"]
    },
    "similars": [
      {
        "manufacturer": "Canon",
        "name": "C70",
        "difference": "+$200, melhor codecs internos, maior peso",
        "priceRatio": "8% mais caro"
      }
    ],
    "manuals": [
      {
        "title": "Manual Oficial Sony FX6",
        "url": "https://www.sony.com/...",
        "type": "PDF"
      }
    ],
    "maintenance": {
      "currentFirmware": "5.0",
      "releaseDate": "2026-03-15",
      "recentIssues": ["Overheating em 4K 120fps após 30min"],
      "troubleshoot": [
        {
          "problem": "Travamento em 4K 120fps",
          "solution": "Atualizar firmware 5.0, usar CFexpress Type A rápido"
        }
      ]
    },
    "financials": {
      "breakEvenDays": 45,
      "residualValue1Yr": "75%",
      "residualValue3Yr": "45%",
      "estimatedDailyCost": "$12.50"
    },
    "comparisons": [
      {
        "field": "ISO limpo",
        "current": "12800",
        "competitor1": "Canon C70: 6400",
        "competitor2": "Blackmagic 6K Pro: 3200"
      }
    ],
    "community": { // NOVO: dados de fóruns e comunidades
      "reddit_threads": 12,
      "reddit_sentiment": "positivo",
      "top_reddit_comments": [
        "Melhor câmera para documentário noturno que usei. — u/dp_brasil",
        "Overheating é real, mas só em takes longos. — u/filmmaker_sp"
      ],
      "forum_sources": [
        "Cinematography.com: FX6 vs C70 discussion",
        "DVXUser: Firmware 5.0 impressions"
      ]
    },
    "gemini_data_store": {
      "sources_found": 3,
      "source_titles": [
        "Manual de Serviço Sony FX6 (PDF indexado)",
        "Review Cinema5D: FX6 vs C70 (HTML indexado)",
        "Thread DVXuser: Overheating solutions (HTML indexado)"
      ]
    },
    "capiau_curia_url": "https://curia.capiau.local/equipment/sony-fx6"
  }
}
```

---

## 19. Resumo Executivo

O **CapIAu-CurIA** v3.1 é uma arquitetura de **5 camadas** que evolui de **$0/mês** (MVP com 15K–52K consultas) até **$900/mês** (enterprise com milhões de requests + Deep Research), sempre mantendo:

- **Zero cartão de crédito** no tier inicial
- **Rotação inteligente de APIs** (12.000+ requisições/mês gratuitas)
- **Tokenização de links** para eliminar alucinações de LLM
- **Circuit breaker e fallback** para resiliência total
- **Timeouts rigorosos** (45s backend, 35s frontend)
- **Zero simulação de dados** — erro técnico claro quando APIs falham
- **Cache hierárquico** (L1 memory → L2 SQLite → L3 IndexedDB) que multiplica capacidade por 3x

### Novidades da v3.1: Fóruns e Comunidades

| Recurso | Status | Quando usar | Custo |
|---------|--------|-------------|-------|
| **Reddit API** | ✅ **Implementar imediatamente** | r/cinematography, r/filmmakers, r/filmmakergear, r/videography | $0 (ilimitado com OAuth) |
| **Diffbot (10K/mês free)** | ✅ **Implementar imediatamente** | Fóruns sem API (Cinematography.com, DVXUser) | $0 |
| **Firecrawl (1K/mês free)** | ✅ **Implementar imediatamente** | Sites de review em Markdown | $0 |
| **Scrape.do (1K/mês free)** | ✅ **Fallback** | Sites protegidos | $0 (só paga se sucesso) |
| **ScraperAPI (1K/mês free)** | ✅ **Fallback** | Sites simples estáticos | $0 |
| **Apify ($5/mês free)** | ✅ **Fallback** | Actors de scraping | $0 |
| **HasData (1K + 100/dia)** | ✅ **Emergência** | Requests sem multiplicadores | $0 |

### Novidades da v3.0: Gemini Enterprise Agent Platform

| Recurso | Status | Quando usar | Custo |
|---------|--------|-------------|-------|
| **Data Stores customizados** | ✅ **Recomendado** | Indexar manuais, reviews, fóruns do setor audiovisual | Storage GCP (baixo) |
| **Grounding Google Search** | ⚠️ **Com moderação** | Síntese com citações quando o custo vale | $14–$35/1K queries |
| **Antigravity (Deep Research)** | ⚠️ **Experimental** | Pesquisas profundas automatizadas | Custo modelo + execução |
| **Managed Agents** | ⚠️ **Experimental** | Prototipagem de agentes autônomos | Custo modelo + sandbox |
| **Enterprise Platform** | ❌ **Não agora** | Governança enterprise (futuro) | Enterprise pricing |

**Stack recomendada para começar hoje:**
1. **Serper.dev** (busca Google, $0)
2. **Tavily** (extração de conteúdo, $0)
3. **Exa** (busca semântica, $0)
4. **Reddit API** (fóruns e comunidade, $0 — ilimitado)
5. **Diffbot** (fóruns sem API, $0 — 10K/mês)
6. **Firecrawl** (sites de review, $0 — 1K/mês)
7. **Scrape.do** (fallback, $0 — 1K/mês)
8. **TMDb + OMDb** (metadados setor, $0)
9. **OpenRouter** (LLM free tier, $0 — ou $10 para 1.000 req/dia)

**Primeira API paga a ativar:** **DataForSEO** ($1/1K tasks) quando precisar de Google Shopping/Amazon em batch.

**Primeira API Cloud a ativar:** **Gemini Data Store** (storage GCP) para indexar a base de conhecimento própria do setor audiovisual — este é o **diferencial estratégico** do CapIAu-CurIA.

---

*Documento gerado em 2026-06-09 para o projeto CapIAu-CurIA — Arquitetura de Referência v3.1*  
*Compatível com diretrizes CapIAu-CurIA v1.0*
