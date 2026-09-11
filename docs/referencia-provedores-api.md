# 📚 Guia de Referência de Provedores de API — CapIAu-CurIA

Este documento serve como índice de referência para obtenção, documentação e gerenciamento das chaves de API utilizadas no ecossistema **CapIAu-CurIA**.

> ⚠️ **Atenção:** Nunca salve chaves de API reais neste arquivo ou em qualquer arquivo versionado no Git. Cadastre suas chaves exclusivamente nas variáveis de ambiente da plataforma de hospedagem (Vercel) ou no arquivo local `.env` (ignorado pelo Git).

---

## 🧠 1. Modelos de Linguagem (LLMs / IA)

### Google AI Studio (Gemini) — *Recomendado (Principal)*
* **Função no CapIAu:** Rota direta rápida (~3-8s) para síntese do Dossiê, Planejador Cognitivo de Rigs e Chatbot CurIA.
* **Painel / Obter Chave:** [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
* **Documentação:** [ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs)
* **Preço / Free Tier:** Tier gratuito generoso (15 RPM nos modelos Flash).
* **Variável de Ambiente:** `GEMINI_API_KEY` (ou `GOOGLE_AI_KEY`)

### OpenRouter — *Fallback & Modelos Adicionais*
* **Função no CapIAu:** Rota de contingência e suporte a modelos de terceiros (Llama, Claude, DeepSeek, etc.).
* **Painel / Obter Chave:** [openrouter.ai/keys](https://openrouter.ai/keys)
* **Documentação:** [openrouter.ai/docs](https://openrouter.ai/docs)
* **Preço / Free Tier:** Modelos gratuitos disponíveis com sufixo `:free` e pay-as-you-go por tokens.
* **Variável de Ambiente:** `OPENROUTER_API_KEY`

### DeepSeek
* **Função:** Modelos avançados de raciocínio de código e lógica profunda (R1 / V3).
* **Painel / Obter Chave:** [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)
* **Documentação:** [api-docs.deepseek.com](https://api-docs.deepseek.com)
* **Variável de Ambiente:** Opcional / Via OpenRouter ou endpoint direto.

### Moonshot AI (Kimi)
* **Função:** Contexto ultra-longo e processamento multilíngue.
* **Painel / Obter Chave:** [platform.moonshot.cn/console/api-keys](https://platform.moonshot.cn/console/api-keys)
* **Documentação:** [platform.moonshot.cn/docs](https://platform.moonshot.cn/docs)

---

## 🔍 2. Mecanismos de Busca & Dados da Web

### Serper.dev (Google Search & Shopping)
* **Função no CapIAu:** Busca em tempo real de ofertas de e-commerce, links de lojas, preços em BRL/USD e discussões orgânicas.
* **Painel / Obter Chave:** [serper.dev/dashboard](https://serper.dev/dashboard)
* **Documentação:** [serper.dev/playground](https://serper.dev/playground)
* **Preço / Free Tier:** 2.500 buscas gratuitas no cadastro.
* **Variável de Ambiente:** `SERPER_API_KEY`

### Tavily Search
* **Função no CapIAu:** Busca orientada a RAG (Retrieval-Augmented Generation) com resumos contextuais precisos de especificações.
* **Painel / Obter Chave:** [app.tavily.com](https://app.tavily.com)
* **Documentação:** [docs.tavily.com](https://docs.tavily.com)
* **Preço / Free Tier:** 1.000 buscas gratuitas por mês.
* **Variável de Ambiente:** `TAVILY_API_KEY`

### Exa.ai (Metaphor)
* **Função no CapIAu:** Busca semântica neural com extração de destaques técnicos e links conceituais.
* **Painel / Obter Chave:** [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys)
* **Documentação:** [docs.exa.ai](https://docs.exa.ai)
* **Preço / Free Tier:** 1.000 buscas gratuitas no trial / $10 em créditos.
* **Variável de Ambiente:** `EXA_API_KEY`

---

## 🕷️ 3. Scraping & Extração de Conteúdo (Opcionais)

### Firecrawl
* **Função no CapIAu:** Converte páginas de reviews e manuais diretamente em Markdown limpo para consumo dos LLMs.
* **Painel / Obter Chave:** [firecrawl.dev/app/api-keys](https://firecrawl.dev/app/api-keys)
* **Documentação:** [docs.firecrawl.dev](https://docs.firecrawl.dev)
* **Preço / Free Tier:** 1.000 créditos mensais gratuitos (sem cartão).
* **Variável de Ambiente:** `FIRECRAWL_API_KEY`

### Diffbot
* **Função no CapIAu:** Extração automática e estruturada de artigos, especificações e threads de fóruns de audiovisual em JSON.
* **Painel / Obter Chave:** [diffbot.com/manage](https://diffbot.com/manage)
* **Documentação:** [docs.diffbot.com](https://docs.diffbot.com)
* **Preço / Free Tier:** 10.000 créditos mensais gratuitos (sem cartão).
* **Variável de Ambiente:** `DIFFBOT_API_KEY`

### Scrape.do
* **Função no CapIAu:** Proxy rotativo com bypass de bloqueios/anti-bot para sites de e-commerce e fóruns antigos.
* **Painel / Obter Chave:** [scrape.do/dashboard](https://scrape.do/dashboard)
* **Documentação:** [scrape.do/documentation](https://scrape.do/documentation)
* **Preço / Free Tier:** 1.000 créditos mensais gratuitos.
* **Variável de Ambiente:** `SCRAPEDO_API_KEY`

---

## 💬 4. Comunidades & Fóruns

### Reddit API (OAuth)
* **Função no CapIAu:** Busca em subreddits especializados (`r/cinematography`, `r/filmmakers`, `r/videography`, `r/photography`).
* **Painel de Apps / Obter Chave:** [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
* **Documentação:** [reddit.com/dev/api](https://www.reddit.com/dev/api)
* **Tipo de App:** `script` ou `web app`.
* **Variáveis de Ambiente:** `REDDIT_CLIENT_ID` e `REDDIT_CLIENT_SECRET`
*(Nota: Se não configuradas, o CapIAu-CurIA usa automaticamente o Serper.dev como fallback de busca no Reddit).*
