# Documentação de Referência das APIs de Busca e IA

Este documento reúne os esquemas de requisição, parâmetros e capacidades das APIs utilizadas pelo ecossistema **CapIAu-CurIA** (Serper.dev, Tavily, Exa.ai e OpenRouter). Ele serve como contexto de treinamento para o assistente cognitivo de compras.

---

## 1. Serper.dev API (Busca Google Orgânica e Shopping)

A Serper.dev fornece acesso rápido e de baixo custo aos resultados do Google Search e Google Shopping.

### Endpoint Geral (Web Search)
*   **URL**: `https://google.serper.dev/search`
*   **Método**: `POST`
*   **Headers**:
    *   `X-API-KEY`: Chave da API
    *   `Content-Type`: `application/json`
*   **Corpo da Requisição (JSON)**:
    ```json
    {
      "q": "consulta de busca (ex: Sony FX3 price)",
      "gl": "br",
      "hl": "pt",
      "num": 10
    }
    ```
*   **Parâmetros**:
    *   `q` (string): Termo de busca.
    *   `gl` (string): Geolocalização (ex: `br` para Brasil, `us` para EUA).
    *   `hl` (string): Idioma dos resultados (ex: `pt` para português).

### Endpoint de Shopping (Google Shopping)
*   **URL**: `https://google.serper.dev/shopping`
*   **Método**: `POST`
*   **Corpo da Requisição (JSON)**:
    ```json
    {
      "q": "nome do equipamento (ex: Canon C70)",
      "gl": "br",
      "hl": "pt"
    }
    ```
*   **Formato de Retorno**: Retorna um array `shopping` contendo objetos com: `title`, `source` (loja), `price`, `link`, `delivery` e `thumbnail`.

---

## 2. Tavily Search API (Extração e RAG)

A Tavily é focada em fornecer dados limpos e estruturados prontos para consumo por LLMs (RAG).

*   **URL**: `https://api.tavily.com/search`
*   **Método**: `POST`
*   **Headers**:
    *   `Content-Type`: `application/json`
    *   `Authorization`: `Bearer tvly-YOUR_API_KEY`
*   **Corpo da Requisição (JSON)**:
    ```json
    {
      "query": "consulta detalhada",
      "search_depth": "basic" | "advanced",
      "max_results": 5,
      "include_answer": true,
      "include_raw_content": true,
      "include_images": false
    }
    ```
*   **Parâmetros Críticos**:
    *   `query` (string): A pergunta ou termo técnico (limite de 400 caracteres).
    *   `search_depth` (string): `basic` para velocidade; `advanced` para análises técnicas de reviews profundas.
    *   `include_answer` (boolean): Retorna um resumo contextualizado gerado por IA.
    *   `include_raw_content` (boolean): Extrai o texto limpo da página HTML para análise direta.

---

## 3. Exa.ai API (Busca Semântica/Neural)

A Exa utiliza embeddings neurais para buscar páginas por conceito e similaridade, não apenas correspondência de palavras-chave.

*   **URL**: `https://api.exa.ai/search`
*   **Método**: `POST`
*   **Headers**:
    *   `x-api-key`: Chave da API
    *   `Content-Type`: `application/json`
*   **Corpo da Requisição (JSON)**:
    ```json
    {
      "query": "conceito semântico (ex: cinematic video quality run and gun camera)",
      "numResults": 5,
      "type": "auto",
      "contents": {
        "text": true,
        "highlights": true
      }
    }
    ```
*   **Parâmetros Críticos**:
    *   `type` (string): Define o algoritmo. O valor `auto` é o padrão recomendado. Outros modos incluem `neural` (legado) e `deep-reasoning`.
    *   `contents` (object): Permite retornar o conteúdo de texto limpo (`text: true`) e os trechos mais importantes da página (`highlights: true`).
    *   `useAutoprompt` (boolean): Otimiza a busca transformando a consulta em uma descrição de link recomendada.

---

## 4. OpenRouter API (Orquestração de LLMs)

Agregador de modelos de linguagem que fornece acesso unificado a modelos como DeepSeek, Llama e Qwen.

*   **URL**: `https://openrouter.ai/api/v1/chat/completions`
*   **Método**: `POST`
*   **Headers**:
    *   `Authorization`: `Bearer SUA_CHAVE`
    *   `Content-Type`: `application/json`
*   **Corpo da Requisição (JSON)**:
    ```json
    {
      "model": "mistralai/mistral-small-3.1-24b-instruct:free",
      "messages": [
        { "role": "system", "content": "Prompt do sistema" },
        { "role": "user", "content": "Prompt do usuário" }
      ],
      "temperature": 0.3
    }
    ```
*   **Modelos Gratuitos Principais**:
    *   `mistralai/mistral-small-3.1-24b-instruct:free` (Ideal para resumos e tradução rápida).
    *   `qwen/qwen3-235b-a22b:free` (Forte em formatação de dados estruturados e tabelas).
    *   `deepseek/deepseek-r1:free` (Ideal para raciocínio complexo, análise de compatibilidade técnica e troubleshooting).
