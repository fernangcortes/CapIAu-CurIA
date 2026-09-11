export interface RigPlanItem {
  query: string;
  category: string;
  reason: string;
  estimatedBudget: number;
}

export interface RigPlan {
  isRig: boolean;
  rigName: string;
  rigDescription: string;
  items: RigPlanItem[];
}

export interface EquipmentData {
  id: string;
  name: string;
  manufacturer: string;
  category: string;
  specs: Record<string, string>;
  prices: {
    store: string;
    price: string;
    condition: string;
    shipping: string;
    warranty: string;
    totalPrice: string;
    isBestDeal: boolean;
    isLowRisk: boolean;
    link: string;
    thumbnail: string;
  }[];
  dossier: {
    summary: string;
    pros: string[];
    cons: string[];
    recommendationScore: number;
    bestFor: string[];
    avoidFor: string[];
  };
  similars: {
    manufacturer: string;
    name: string;
    difference: string;
    priceRatio: string;
  }[];
  manuals: {
    title: string;
    url: string;
    type: string;
  }[];
  maintenance: {
    currentFirmware: string;
    releaseDate: string;
    recentIssues: string[];
    troubleshoot: { problem: string; solution: string; }[];
  };
  financials: {
    breakEvenDays: number;
    residualValue1Yr: string;
    residualValue3Yr: string;
    estimatedDailyCost: string;
  };
  comparisons: {
    field: string;
    current: string;
    competitor1: string;
    competitor2: string;
  }[];
}

export interface ApiKeys {
  openRouter: string;
  googleAi: string;
  serper: string;
  tavily: string;
  exa: string;
  redditClientId: string;
  redditClientSecret: string;
  diffbot: string;
  firecrawl: string;
  scrapeDo: string;
}

// Chaves locais guardadas no localStorage
const KEYS_STORAGE_KEY = 'capiau_curia_api_keys';
const PROXY_URL_KEY = 'capiau_curia_proxy_url';
const MODEL_STORAGE_KEY = 'capiau_curia_api_model';

export function getLocalKeys(): ApiKeys {
  try {
    const keysJson = localStorage.getItem(KEYS_STORAGE_KEY);
    if (keysJson) {
      const parsed = JSON.parse(keysJson);
      // Garantir compatibilidade se chaves antigas estiverem salvas
      return {
        openRouter: parsed.openRouter || '',
        googleAi: parsed.googleAi || '',
        serper: parsed.serper || '',
        tavily: parsed.tavily || '',
        exa: parsed.exa || '',
        redditClientId: parsed.redditClientId || '',
        redditClientSecret: parsed.redditClientSecret || '',
        diffbot: parsed.diffbot || '',
        firecrawl: parsed.firecrawl || '',
        scrapeDo: parsed.scrapeDo || ''
      };
    }
  } catch (e) {
    console.error('Erro ao ler chaves do localStorage:', e);
  }
  return { 
    openRouter: '', 
    googleAi: '', 
    serper: '', 
    tavily: '', 
    exa: '',
    redditClientId: '',
    redditClientSecret: '',
    diffbot: '',
    firecrawl: '',
    scrapeDo: ''
  };
}

export function saveLocalKeys(keys: ApiKeys): void {
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
}

export function getProxyUrl(): string {
  const saved = localStorage.getItem(PROXY_URL_KEY);
  if (saved && saved !== 'http://localhost:5000') {
    return saved.replace(/\/+$/, '');
  }
  return '/api';
}

export function saveProxyUrl(url: string): void {
  localStorage.setItem(PROXY_URL_KEY, url.trim().replace(/\/+$/, ''));
}

export function getLocalModel(): string {
  return localStorage.getItem(MODEL_STORAGE_KEY) || 'google/gemini-2.5-flash';
}

export function saveLocalModel(model: string): void {
  localStorage.setItem(MODEL_STORAGE_KEY, model);
}

/**
 * Detecta se devemos usar a API direta do Google AI Studio.
 * Condições: chave googleAi presente E modelo começa com 'google/gemini'.
 */
export function shouldUseGoogleAI(keys: ApiKeys, model: string): boolean {
  return !!keys.googleAi && model.startsWith('google/gemini');
}

/**
 * Converte o identificador de modelo do OpenRouter (ex: 'google/gemini-2.5-flash')
 * para o nome de modelo do Google AI Studio (ex: 'gemini-2.5-flash').
 */
export function toGoogleModelName(openRouterModel: string): string {
  return openRouterModel.replace('google/', '');
}

export function restoreLinks(obj: any, urlMap: Record<string, string>, thumbMap: Record<string, string>): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => restoreLinks(item, urlMap, thumbMap));
  }

  const restored: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      if (val.startsWith('LINK_') && urlMap[val]) {
        restored[key] = urlMap[val];
      } else if (val.startsWith('THUMB_') && thumbMap[val]) {
        restored[key] = thumbMap[val];
      } else {
        restored[key] = val;
      }
    } else if (typeof val === 'object') {
      restored[key] = restoreLinks(val, urlMap, thumbMap);
    } else {
      restored[key] = val;
    }
  }
  return restored;
}

export function sanitizeEquipmentData(data: any, query: string): EquipmentData {
  const cleanQuery = query.trim();
  const id = data?.id || cleanQuery.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const name = data?.name || cleanQuery;
  const manufacturer = data?.manufacturer || 'Desconhecido';
  const category = data?.category || 'All';
  const specs = data?.specs && typeof data.specs === 'object' ? data.specs : {};
  
  // prices
  let prices = Array.isArray(data?.prices) ? data.prices : [];
  if (prices.length === 0) {
    prices = [{ store: 'Não encontrado', price: 'N/A', condition: 'Novo', shipping: 'N/A', link: '#' }];
  } else {
    prices = prices.map((p: any) => ({
      store: p?.store || 'Desconhecida',
      price: p?.price || 'N/A',
      condition: p?.condition || 'Novo',
      shipping: p?.shipping || 'N/A',
      link: p?.link || '#',
      warranty: p?.warranty || '',
      totalPrice: p?.totalPrice || p?.price || 'N/A',
      isBestDeal: !!p?.isBestDeal,
      isLowRisk: !!p?.isLowRisk,
    }));
  }

  // dossier
  const dossier = data?.dossier || {};
  const sanitizedDossier = {
    summary: dossier?.summary || 'Sem resumo analítico disponível.',
    pros: Array.isArray(dossier?.pros) ? dossier.pros.filter(Boolean) : [],
    cons: Array.isArray(dossier?.cons) ? dossier.cons.filter(Boolean) : [],
    recommendationScore: typeof dossier?.recommendationScore === 'number' ? dossier.recommendationScore : 7.0,
    bestFor: Array.isArray(dossier?.bestFor) ? dossier.bestFor.filter(Boolean) : [],
    avoidFor: Array.isArray(dossier?.avoidFor) ? dossier.avoidFor.filter(Boolean) : [],
  };

  if (sanitizedDossier.pros.length === 0) sanitizedDossier.pros = ['Informações gerais não especificadas'];
  if (sanitizedDossier.cons.length === 0) sanitizedDossier.cons = ['Nenhuma desvantagem crítica reportada'];

  // similars
  let similars = Array.isArray(data?.similars) ? data.similars : [];
  similars = similars.map((s: any) => ({
    name: s?.name || 'Equipamento Equivalente',
    manufacturer: s?.manufacturer || 'Genérico',
    difference: s?.difference || 'Diferenças técnicas não especificadas.',
    priceRatio: s?.priceRatio || '1.0x',
  }));

  // manuals
  let manuals = Array.isArray(data?.manuals) ? data.manuals : [];
  if (manuals.length === 0) {
    manuals = [{ title: 'Buscar manual no Google', url: `https://www.google.com/search?q=${encodeURIComponent(name + ' manual pdf')}`, type: 'PDF' }];
  } else {
    manuals = manuals.map((m: any) => ({
      title: m?.title || 'Documentação Online',
      url: m?.url || '#',
      type: m?.type || 'PDF',
    }));
  }

  // maintenance
  const maintenance = data?.maintenance || {};
  const sanitizedMaintenance = {
    currentFirmware: maintenance?.currentFirmware || 'v1.0.0 (Estável)',
    releaseDate: maintenance?.releaseDate || 'N/A',
    recentIssues: Array.isArray(maintenance?.recentIssues) ? maintenance.recentIssues.filter(Boolean) : [],
    troubleshoot: Array.isArray(maintenance?.troubleshoot) ? maintenance.troubleshoot.map((t: any) => ({
      problem: t?.problem || 'Problema não especificado',
      solution: t?.solution || 'Verifique o manual de instruções do fabricante.'
    })) : [],
  };

  // financials
  const financials = data?.financials || {};
  const sanitizedFinancials = {
    breakEvenDays: typeof financials?.breakEvenDays === 'number' ? financials.breakEvenDays : 30,
    residualValue1Yr: financials?.residualValue1Yr || 'N/A',
    residualValue3Yr: financials?.residualValue3Yr || 'N/A',
    estimatedDailyCost: financials?.estimatedDailyCost || 'N/A',
  };

  // comparisons
  let comparisons = Array.isArray(data?.comparisons) ? data.comparisons : [];
  comparisons = comparisons.map((c: any) => ({
    field: c?.field || 'Característica',
    current: c?.current || 'N/A',
    competitor1: c?.competitor1 || 'N/A',
    competitor2: c?.competitor2 || 'N/A',
  }));

  return {
    id,
    name,
    manufacturer,
    category,
    specs,
    prices,
    dossier: sanitizedDossier,
    similars,
    manuals,
    maintenance: sanitizedMaintenance,
    financials: sanitizedFinancials,
    comparisons,
  };
}

// Cache de resultados com TTL
interface CacheEntry {
  data: EquipmentData;
  timestamp: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

function getCachedResult(query: string): EquipmentData | null {
  try {
    const cacheKey = `capiau_cache_${query.toLowerCase().trim()}`;
    const cachedJson = localStorage.getItem(cacheKey);
    if (cachedJson) {
      const entry: CacheEntry = JSON.parse(cachedJson);
      if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
        return entry.data;
      }
    }
  } catch (e) {
    console.error('Erro ao ler cache:', e);
  }
  return null;
}

function setCachedResult(query: string, data: EquipmentData): void {
  try {
    const cacheKey = `capiau_cache_${query.toLowerCase().trim()}`;
    const entry: CacheEntry = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (e) {
    console.error('Erro ao salvar no cache:', e);
  }
}

/**
 * Busca dados do equipamento. Orquestra APIs reais e retorna os dados encontrados.
 */
export async function searchEquipment(
  query: string, 
  mode: string = 'A', 
  searchApi: string = 'serper',
  minSpecs?: Record<string, string>
): Promise<{ data: EquipmentData }> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    throw new Error('A consulta não pode estar vazia.');
  }

  const keys = getLocalKeys();
  const proxyUrl = getProxyUrl();
  const hasProxy = !!proxyUrl;

  // 1. Tentar ler do Cache
  const cached = getCachedResult(cleanQuery);
  if (cached) {
    console.log('Retornando resultado do cache local:', cleanQuery);
    return { data: cached };
  }

  // Verificar chaves no cliente se não houver proxy
  if (!hasProxy) {
    if (!keys.openRouter) {
      throw new Error('Chave API do OpenRouter ausente (aba Perfil). Necessária para sintetizar dados.');
    }
    if (searchApi === 'serper' && !keys.serper) {
      throw new Error('Chave API do Serper.dev ausente para busca Google (aba Perfil).');
    }
    if (searchApi === 'tavily' && !keys.tavily) {
      throw new Error('Chave API do Tavily ausente para busca RAG (aba Perfil).');
    }
    if (searchApi === 'exa' && !keys.exa) {
      throw new Error('Chave API do Exa.ai ausente para busca Semântica (aba Perfil).');
    }
    if (searchApi === 'full' && (!keys.serper || !keys.tavily || !keys.exa)) {
      throw new Error('Todas as chaves (Serper, Tavily, Exa) são necessárias para a Pesquisa Completa.');
    }
  }

  try {
    const model = getLocalModel();

    // Se há um proxy configurado, tenta fazer a requisição através do proxy backend
    if (hasProxy) {
      console.log('Tentando requisição através do proxy backend:', proxyUrl);
      const response = await fetch(`${proxyUrl}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cleanQuery, mode, keys, searchApi, minSpecs, model }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Proxy retornou erro status ${response.status}`);
      }

      const data = await response.json();
      const sanitized = sanitizeEquipmentData(data, cleanQuery);
      setCachedResult(cleanQuery, sanitized);
      return { data: sanitized };
    }

    // Se temos chaves locais, realizamos a orquestração via chamadas diretas
    const urlMap: Record<string, string> = {};
    const thumbMap: Record<string, string> = {};
    let linkCounter = 1;
    let thumbCounter = 1;

    function registerLink(url: string | undefined): string {
      if (!url) return '#';
      for (const [key, val] of Object.entries(urlMap)) {
        if (val === url) return key;
      }
      const key = `LINK_${linkCounter++}`;
      urlMap[key] = url;
      return key;
    }

    // @ts-ignore: used only by server proxy mapping, kept for sync compatibility
    function registerThumb(url: string | undefined): string {
      if (!url) return '';
      for (const [key, val] of Object.entries(thumbMap)) {
        if (val === url) return key;
      }
      const key = `THUMB_${thumbCounter++}`;
      thumbMap[key] = url;
      return key;
    }

    let searchResultsText = '';
    
    if (searchApi === 'serper' || searchApi === 'full') {
      console.log('[Cliente] Consultando Serper.dev...');
      try {
        const serperRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': keys.serper,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q: cleanQuery, gl: 'br', hl: 'pt' }),
        });
        if (serperRes.ok) {
          const json = await serperRes.json();
          searchResultsText += `[Google Search]\n` + (json.organic || []).map((r: any) => `- ${r.title}: ${r.snippet}\n  Link: ${registerLink(r.link)}`).join('\n') + '\n\n';
        } else {
          console.warn(`[Cliente] Serper.dev respondeu com status ${serperRes.status}`);
        }
      } catch (err: any) {
        console.warn('[Cliente] Erro ao consultar Serper.dev:', err.message);
      }
    }

    if (searchApi === 'tavily' || searchApi === 'full') {
      console.log('[Cliente] Consultando Tavily...');
      try {
        const tavilyRes = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: keys.tavily,
            query: cleanQuery,
            search_depth: 'basic',
            include_answer: true,
          }),
        });
        if (tavilyRes.ok) {
          const json = await tavilyRes.json();
          searchResultsText += `[Tavily Answer] ${json.answer || ''}\n` + (json.results || []).map((r: any) => `- ${r.title}: ${r.content}\n  Link: ${registerLink(r.url)}`).join('\n') + '\n\n';
        } else {
          console.warn(`[Cliente] Tavily respondeu com status ${tavilyRes.status}`);
        }
      } catch (err: any) {
        console.warn('[Cliente] Erro ao consultar Tavily:', err.message);
      }
    }

    if (searchApi === 'exa' || searchApi === 'full') {
      console.log('[Cliente] Consultando Exa.ai...');
      try {
        const exaRes = await fetch('https://api.exa.ai/search', {
          method: 'POST',
          headers: {
            'x-api-key': keys.exa,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: cleanQuery,
            numResults: 5,
            type: 'auto',
            contents: { text: false, highlights: true }
          }),
        });
        if (exaRes.ok) {
          const json = await exaRes.json();
          searchResultsText += `[Exa.ai Highlights]\n` + (json.results || []).map((r: any) => `- ${r.title}: ${(r.highlights || []).join(' ')}\n  Link: ${registerLink(r.url)}`).join('\n') + '\n\n';
        } else {
          console.warn(`[Cliente] Exa.ai respondeu com status ${exaRes.status}`);
        }
      } catch (err: any) {
        console.warn('[Cliente] Erro ao consultar Exa.ai:', err.message);
      }
    }

    if (!searchResultsText.trim()) {
      throw new Error('Nenhuma das APIs de busca (Serper/Tavily/Exa) retornou dados reais sobre o equipamento. Por favor, verifique suas chaves e a conexão.');
    }

    let specsRequirements = '';
    if (minSpecs && Object.keys(minSpecs).length > 0) {
      specsRequirements = `REQUISITOS MÍNIMOS EXIGIDOS PELO USUÁRIO:\n` +
        Object.entries(minSpecs).map(([k, v]) => `- ${k}: ${v}`).join('\n') + `\nFiltre ou avalie os resultados de busca e garanta que os modelos de concorrentes ou especificações técnicas atendam ou sejam altamente compatíveis com essas exigências.\n\n`;
    }

    // Processamento do OpenRouter se chave estiver presente
    console.log('[Cliente] Chamando OpenRouter para consolidar os resultados das buscas...');
    const prompt = `Consolide as informações de busca técnica sobre o equipamento "${cleanQuery}" em um formato JSON estruturado exato de acordo com as especificações de 2026.
Lógica do Modo de busca ativo: ${mode}.
${specsRequirements}
Fontes de busca cruas:
${searchResultsText}

Gere EXATAMENTE um objeto JSON que obedeça a este formato, sem markdown, crases ou caracteres extras:
{
  "id": "${cleanQuery.toLowerCase().replace(/[^a-z0-9]+/g, '-')}",
  "name": "${cleanQuery}",
  "manufacturer": "Nome do Fabricante",
  "category": "Câmeras" | "Lentes" | "Áudio" | "Iluminação" | "Suporte e Rigging" | "Monitores e Transmissores",
  "specs": {
    "Montagem": "especificação (se câmera/lente)",
    "Resolução Máxima": "especificação (se câmera)",
    "Sensor": "especificação (se câmera)",
    "Conexões": "especificação",
    "Peso": "especificação",
    "Alimentação": "especificação"
  },
  "prices": [
    { 
      "store": "Nome da Loja", 
      "price": "R$ X.XXX ou $X.XXX", 
      "condition": "Novo" | "Usado", 
      "shipping": "Frete Grátis" | "R$ XX", 
      "warranty": "12 meses" | "Sem garantia", 
      "totalPrice": "Preço total com frete", 
      "isBestDeal": true | false, 
      "isLowRisk": true | false, 
      "link": "Use exatamente o identificador de link correspondente como 'LINK_1', 'LINK_2' etc. NUNCA invente links de forma alguma. Se não houver, use '#'.",
      "thumbnail": "Use exatamente o identificador correspondente como 'THUMB_1' etc. ou string vazia '' se não houver."
    }
  ],
  "dossier": {
    "summary": "Resumo analítico do equipamento e sua finalidade",
    "pros": ["pró 1", "pró 2"],
    "cons": ["contra 1", "contra 2"],
    "recommendationScore": 8.5,
    "bestFor": ["uso 1", "uso 2"],
    "avoidFor": ["evitar 1"]
  },
  "similars": [
    { 
      "manufacturer": "Fabricante de outro modelo alternativo/concorrente", 
      "name": "Nome do modelo alternativo/concorrente", 
      "difference": "Diferença técnica real em relação a este equipamento", 
      "priceRatio": "0.8x" 
    }
  ],
  "manuals": [
    { 
      "title": "Manual de Instruções Oficial PDF ou Review", 
      "url": "Se houver link de manual/review na busca com marcador como 'LINK_X', use-o. Caso contrário, use '#'.", 
      "type": "PDF" | "Vídeo" 
    }
  ],
  "maintenance": {
    "currentFirmware": "vX.X.X",
    "releaseDate": "2026-XX-XX",
    "recentIssues": ["Bug ou issue conhecido do lote"],
    "troubleshoot": [
      { "problem": "Problema X", "solution": "Solução Y" }
    ]
  },
  "financials": {
    "breakEvenDays": 12,
    "residualValue1Yr": "R$ X.XXX (80%)",
    "residualValue3Yr": "R$ X.XXX (50%)",
    "estimatedDailyCost": "R$ XX"
  },
  "comparisons": [
    { 
      "field": "Preço" | "Sensor/GPU" | "Resolução/Memória" | "Peso" | "Bocal" | "Autonomia", 
      "current": "Valor do produto pesquisado", 
      "competitor1": "Valor do concorrente real A (marca/modelo diferente da mesma categoria)", 
      "competitor2": "Valor do concorrente real B (marca/modelo diferente da mesma categoria)" 
    }
  ]
}

REGRAS CRÍTICAS DE CONTEÚDO:
- "similars" e "comparisons" devem obrigatoriamente se referir a EQUIPAMENTOS alternativos e marcas concorrentes REAIS. NUNCA coloque manuais, softwares, lentes avulsas (se o item for câmera) ou acessórios nessas listas.
- Não crie links fictícios de forma alguma. Use apenas os placeholders LINK_X fornecidos nas fontes cruas.`;

    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${keys.openRouter}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      }),
    });

    if (!openRouterRes.ok) {
      throw new Error(`Erro no OpenRouter status ${openRouterRes.status}`);
    }

    const aiJson = await openRouterRes.json();
    const aiText = aiJson.choices?.[0]?.message?.content || '';
    
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Não foi possível obter um JSON estruturado da IA.');
    }

    let data = JSON.parse(jsonMatch[0]);
    // Restaurar links reais
    data = restoreLinks(data, urlMap, thumbMap);
    
    const sanitized = sanitizeEquipmentData(data, cleanQuery);

    setCachedResult(cleanQuery, sanitized);
    return { data: sanitized };

  } catch (error: any) {
    console.error('Falha na busca ativa:', error);
    throw new Error(`Erro na busca ativa: ${error.message || error}`);
  }
}

/**
 * Solicita o planejamento cognitivo de um Rig ou busca.
 */
export async function planRig(query: string): Promise<RigPlan> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    throw new Error('A consulta não pode estar vazia.');
  }

  const keys = getLocalKeys();
  const proxyUrl = getProxyUrl();
  const hasProxy = !!proxyUrl;

  try {
    const model = getLocalModel();

    if (hasProxy) {
      console.log('[apiRouter] Solicitando planejamento ao proxy backend...');
      const response = await fetch(`${proxyUrl}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cleanQuery, keys, model }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Proxy retornou erro status ${response.status}`);
      }

      return await response.json();
    }

    console.log('[apiRouter] Executando planejamento local (direto no cliente)...');
    
    const prompt = `Você é o Planejador Cognitivo de Hardware do ecossistema CapIAu-CurIA (2026).
Sua missão é receber um pedido do usuário para equipamentos ou setups de gravação audiovisual/TI e convertê-lo em um plano de equipamentos (Rig) estruturado.

O usuário descreveu a necessidade assim: "${cleanQuery}"

Sua tarefa:
1. Analise o pedido do usuário (mesmo que seja vago, leigo ou incompleto).
2. Determine se ele se refere a um único equipamento (ex: "Sony FX3") ou a um conjunto/setup de equipamentos (ex: "kit de podcast de baixo custo").
3. Se for um único equipamento, determine o nome correto de modelo e fabricante e crie um plano contendo apenas esse item.
4. Se for um setup com múltiplos itens, decida quais e quantos equipamentos são necessários (por exemplo, corpo da câmera, lente, microfone, tripé, iluminação, etc.) dependendo do pedido. Dê ao setup um nome sugestivo de Rig e uma descrição curta.
5. Para cada equipamento proposto, defina:
   - "query": O termo de pesquisa ideal e preciso (ex: "Sony FX3" ou "Sennheiser MKH416" em vez de apenas "microfone bom").
   - "category": "Câmeras" | "Lentes" | "Áudio" | "Iluminação" | "Suporte e Rigging" | "Monitores e Transmissores"
   - "reason": Por que esse equipamento foi escolhido para a necessidade do usuário (explicado em linguagem simples).
   - "estimatedBudget": Um orçamento estimado ou sugerido em dólares (ex: 2500) para esse item.

Retorne EXATAMENTE um objeto JSON que obedeça a este formato estruturado, sem blocos de código markdown ou crases (não inclua \`\`\`json). Apenas inicie e finalize com chaves { ... }:
{
  "isRig": true,
  "rigName": "Nome Sugestivo do Setup / Rig",
  "rigDescription": "Descrição breve do objetivo do setup em português",
  "items": [
    {
      "query": "Termo de busca do equipamento recomendado",
      "category": "Câmeras" | "Lentes" | "Áudio" | "Iluminação" | "Suporte e Rigging" | "Monitores e Transmissores",
      "reason": "Explicação amigável de por que este item é necessário para este projeto",
      "estimatedBudget": 1500
    }
  ]
}

Se o usuário buscou um único produto específico, retorne "isRig": false, e inclua apenas esse item no array "items".`;

    let aiText = '';

    if (shouldUseGoogleAI(keys, model)) {
      const googleModel = toGoogleModelName(model).replace(':free', '');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${keys.googleAi}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
        })
      });
      if (!response.ok) {
        throw new Error(`Erro na API Google AI Studio direto status ${response.status}`);
      }
      const json = await response.json();
      aiText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keys.openRouter}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1
        }),
      });
      if (!response.ok) {
        throw new Error(`Erro no OpenRouter direto status ${response.status}`);
      }
      const json = await response.json();
      aiText = json.choices?.[0]?.message?.content || '';
    }

    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Não foi possível obter um plano de Rig estruturado em JSON.');
    }
  } catch (err: any) {
    console.warn('[apiRouter] Falha no planejamento ativo, retornando plano simulado procedural:', err);
    const isRigQuery = query.toLowerCase().includes('kit') || query.toLowerCase().includes('setup') || query.toLowerCase().includes('combo') || query.toLowerCase().includes('para') || query.toLowerCase().includes('gravar') || query.split(' ').length > 2;
    
    if (isRigQuery) {
      return {
        isRig: true,
        rigName: `Setup Procedural: ${query}`,
        rigDescription: `Um setup básico gerado offline em contingência para suprir a necessidade de: "${query}"`,
        items: [
          {
            query: 'Sony FX30',
            category: 'Câmeras',
            reason: 'Câmera de cinema compacta e excelente custo-benefício para produções gerais.',
            estimatedBudget: 1800
          },
          {
            query: 'Sigma 18-50mm f/2.8 DC DN',
            category: 'Lentes',
            reason: 'Lente zoom compacta e versátil com grande abertura constante para a FX30.',
            estimatedBudget: 550
          },
          {
            query: 'Rode VideoMic Pro+',
            category: 'Áudio',
            reason: 'Microfone shotgun de alta qualidade para captação limpa montado na sapata.',
            estimatedBudget: 300
          }
        ]
      };
    } else {
      return {
        isRig: false,
        rigName: query,
        rigDescription: `Busca individual por ${query}`,
        items: [
          {
            query: query,
            category: 'Câmeras',
            reason: 'Equipamento solicitado individualmente.',
            estimatedBudget: 1000
          }
        ]
      };
    }
  }
}

export interface ServerApiStatus {
  openRouter: boolean;
  googleAi: boolean;
  serper: boolean;
  tavily: boolean;
  exa: boolean;
  redditClientId: boolean;
  redditClientSecret: boolean;
  diffbot: boolean;
  firecrawl: boolean;
  scrapeDo: boolean;
}

export async function getServerApiStatus(): Promise<ServerApiStatus | null> {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) return null;
  try {
    const res = await fetch(`${proxyUrl}/api-status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Erro ao buscar status de API do servidor proxy:', e);
  }
  return null;
}

