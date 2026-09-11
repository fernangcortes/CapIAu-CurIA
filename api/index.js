import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Simple manual .env loader for local development
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
} catch {
  // Silent in serverless environments where fs might be read-only or .env absent
}

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ─── Helpers ────────────────────────────────────────────────────────────────

function getEffectiveKeys(clientKeys) {
  const localKeys = clientKeys || {};
  return {
    openRouter: localKeys.openRouter || process.env.OPENROUTER_API_KEY || '',
    googleAi: localKeys.googleAi || process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY || '',
    serper: localKeys.serper || process.env.SERPER_API_KEY || '',
    tavily: localKeys.tavily || process.env.TAVILY_API_KEY || '',
    exa: localKeys.exa || process.env.EXA_API_KEY || '',
    redditClientId: localKeys.redditClientId || process.env.REDDIT_CLIENT_ID || '',
    redditClientSecret: localKeys.redditClientSecret || process.env.REDDIT_CLIENT_SECRET || '',
    diffbot: localKeys.diffbot || process.env.DIFFBOT_API_KEY || '',
    firecrawl: localKeys.firecrawl || process.env.FIRECRAWL_API_KEY || '',
    scrapeDo: localKeys.scrapeDo || process.env.SCRAPEDO_API_KEY || ''
  };
}

async function backendFetch(url, options = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error ${response.status}: ${text}`);
    }
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`A requisição para a API expirou (tempo limite de ${timeoutMs / 1000}s atingido).`);
    }
    throw error;
  }
}

async function scrapeWithFirecrawl(url, apiKey) {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, formats: ['markdown'] })
    });
    if (res.ok) {
      const json = await res.json();
      return json.data?.markdown || '';
    }
  } catch (e) {
    console.warn('[Proxy] Erro Firecrawl:', e.message);
  }
  return '';
}

async function scrapeWithDiffbot(url, apiKey) {
  try {
    const res = await fetch(`https://api.diffbot.com/v3/article?token=${apiKey}&url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const json = await res.json();
      return json.objects?.[0]?.text || '';
    }
  } catch (e) {
    console.warn('[Proxy] Erro Diffbot:', e.message);
  }
  return '';
}

async function scrapeWithScrapeDo(url, apiKey) {
  try {
    const res = await fetch(`https://api.scrape.do?token=${apiKey}&url=${encodeURIComponent(url)}`);
    if (res.ok) {
      return await res.text();
    }
  } catch (e) {
    console.warn('[Proxy] Erro Scrape.do:', e.message);
  }
  return '';
}

async function fetchRedditViaOAuth(query, clientId, clientSecret, registerLink) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'CapIAu-CurIA/3.1 (contact@capiau.local)'
    },
    body: 'grant_type=client_credentials'
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Auth Reddit falhou status ${tokenRes.status}: ${text}`);
  }

  const tokenJson = await tokenRes.json();
  const token = tokenJson.access_token;
  if (!token) {
    throw new Error('Access Token não encontrado no JSON do Reddit');
  }

  const subreddits = ['cinematography', 'filmmakers', 'videography', 'photography'];
  let redditContext = '';
  const q = encodeURIComponent(query);

  for (const sub of subreddits) {
    try {
      const url = `https://oauth.reddit.com/r/${sub}/search.json?q=${q}&restrict_sr=1&limit=3`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'CapIAu-CurIA/3.1 (contact@capiau.local)'
        }
      });

      if (res.ok) {
        const json = await res.json();
        const posts = (json.data?.children || []).map(child => child.data);
        if (posts.length > 0) {
          redditContext += `[Discussões no Reddit r/${sub}]\n` + posts.map(p => 
            `- Post: ${p.title}\n  Snippet: ${p.selftext ? p.selftext.substring(0, 200) + '...' : 'Sem corpo de texto.'}\n  Link: registerLinkPlaceholder`
          ).join('\n') + '\n\n';
          
          posts.forEach(p => {
            const link = 'https://reddit.com' + p.permalink;
            redditContext = redditContext.replace('registerLinkPlaceholder', registerLink(link));
          });
        }
      }
    } catch (err) {
      console.warn(`[Proxy] Erro ao buscar via OAuth no r/${sub}:`, err.message);
    }
  }
  return redditContext;
}

async function fetchRedditViaSerper(query, serperKey, registerLink) {
  if (!serperKey) {
    return '';
  }
  try {
    const searchQuery = `site:reddit.com/r/cinematography OR site:reddit.com/r/filmmakers OR site:reddit.com/r/videography OR site:reddit.com/r/photography "${query}"`;
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: searchQuery, gl: 'br', hl: 'pt', num: 5 }),
    });

    if (res.ok) {
      const json = await res.json();
      const organic = json.organic || [];
      if (organic.length > 0) {
        let redditContext = '[Discussões relevantes no Reddit (Coletadas via Google)]\n';
        organic.forEach(item => {
          redditContext += `- Tópico: ${item.title}\n  Snippet: ${item.snippet}\n  Link: ${registerLink(item.link)}\n`;
        });
        return redditContext + '\n';
      }
    }
  } catch (err) {
    console.warn('[Proxy] Erro no fallback Serper para Reddit:', err.message);
  }
  return '';
}

async function callLLM({ prompt, messages, keys, model, temperature = 0.3 }) {
  const googleAiKey = keys?.googleAi;
  const isGemini = model && model.startsWith('google/gemini');

  // ── ROTA RÁPIDA: Google AI Studio Direto ──
  if (googleAiKey && isGemini) {
    try {
      const googleModel = model.replace('google/', '').replace(':free', '');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${googleAiKey}`;

      const contents = [];
      let systemInstruction = undefined;

      if (messages && Array.isArray(messages)) {
        for (const msg of messages) {
          if (msg.role === 'system') {
            systemInstruction = { parts: [{ text: msg.content }] };
          } else if (msg.role === 'user') {
            contents.push({ role: 'user', parts: [{ text: msg.content }] });
          } else if (msg.role === 'assistant' || msg.role === 'model') {
            contents.push({ role: 'model', parts: [{ text: msg.content }] });
          }
        }
      } else if (prompt) {
        contents.push({ role: 'user', parts: [{ text: prompt }] });
      }

      const requestBody = {
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: 8192,
        }
      };

      if (systemInstruction) {
        requestBody.systemInstruction = systemInstruction;
      }

      const googleRes = await backendFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const text = googleRes?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return text;
    } catch (googleError) {
      console.warn(`[Proxy] Falha na rota direta Google AI Studio: ${googleError.message}. Tentando fallback via OpenRouter...`);
      if (!keys?.openRouter) {
        throw new Error(`Erro na API Google AI Studio (${googleError.message}) e nenhuma chave do OpenRouter configurada para fallback.`);
      }
    }
  }

  // ── ROTA FALLBACK: OpenRouter ──
  if (!keys?.openRouter) {
    throw new Error('Nenhuma chave de LLM configurada. Adicione a chave Google AI Studio ou OpenRouter na aba Perfil ou configure as variáveis de ambiente na Vercel.');
  }

  const body = {
    model: model || 'google/gemini-2.5-flash',
    temperature,
  };

  if (messages && Array.isArray(messages)) {
    body.messages = messages;
  } else if (prompt) {
    body.messages = [{ role: 'user', content: prompt }];
  }

  const openRouterRes = await backendFetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${keys.openRouter}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return openRouterRes.choices?.[0]?.message?.content || '';
}

function restoreLinks(obj, urlMap, thumbMap) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => restoreLinks(item, urlMap, thumbMap));
  }

  const restored = {};
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

// ─── Router ─────────────────────────────────────────────────────────────────

const router = express.Router();

router.post('/search', async (req, res) => {
  const { query, mode, keys, searchApi, minSpecs, model } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Consulta vazia.' });
  }

  const mergedKeys = getEffectiveKeys(keys);

  if (!mergedKeys.openRouter && !mergedKeys.googleAi) {
    return res.status(400).json({ error: 'Chave Google AI Studio ou OpenRouter ausente. Pelo menos uma é necessária para sintetizar dados.' });
  }
  if ((searchApi === 'serper' || searchApi === 'full') && !mergedKeys.serper) {
    return res.status(400).json({ error: 'Chave API do Serper.dev ausente. Ela é necessária para busca Google/Shopping.' });
  }
  if ((searchApi === 'tavily' || searchApi === 'full') && !mergedKeys.tavily) {
    return res.status(400).json({ error: 'Chave API da Tavily ausente. Ela é necessária para resumos RAG.' });
  }
  if ((searchApi === 'exa' || searchApi === 'full') && !mergedKeys.exa) {
    return res.status(400).json({ error: 'Chave API da Exa.ai ausente. Ela é necessária para busca semântica.' });
  }

  try {
    const urlMap = {};
    const thumbMap = {};
    let linkCounter = 1;
    let thumbCounter = 1;

    function registerLink(url) {
      if (!url) return '#';
      for (const [key, val] of Object.entries(urlMap)) {
        if (val === url) return key;
      }
      const key = `LINK_${linkCounter++}`;
      urlMap[key] = url;
      return key;
    }

    function registerThumb(url) {
      if (!url) return '';
      for (const [key, val] of Object.entries(thumbMap)) {
        if (val === url) return key;
      }
      const key = `THUMB_${thumbCounter++}`;
      thumbMap[key] = url;
      return key;
    }

    const promises = [];
    
    // 1. Serper.dev Search & Shopping
    if (searchApi === 'serper' || searchApi === 'full') {
      promises.push(
        backendFetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': mergedKeys.serper,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q: query, gl: 'br', hl: 'pt' }),
        }).then(res => ({ type: 'serper_search', data: res }))
          .catch(err => ({ type: 'error', source: 'Serper.dev Web', message: err.message }))
      );

      if (searchApi === 'full' || mode === 'E') {
        promises.push(
          backendFetch('https://google.serper.dev/shopping', {
            method: 'POST',
            headers: {
              'X-API-KEY': mergedKeys.serper,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ q: query, gl: 'br', hl: 'pt' }),
          }).then(res => ({ type: 'serper_shopping', data: res }))
            .catch(err => ({ type: 'error', source: 'Serper.dev Shopping', message: err.message }))
        );
      }
    }

    // 2. Tavily Search
    if (searchApi === 'tavily' || searchApi === 'full') {
      promises.push(
        backendFetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: mergedKeys.tavily,
            query: query,
            search_depth: 'basic',
            include_answer: true,
          }),
        }).then(res => ({ type: 'tavily', data: res }))
          .catch(err => ({ type: 'error', source: 'Tavily RAG', message: err.message }))
      );
    }

    // 3. Exa.ai Search
    if (searchApi === 'exa' || searchApi === 'full') {
      promises.push(
        backendFetch('https://api.exa.ai/search', {
          method: 'POST',
          headers: {
            'x-api-key': mergedKeys.exa,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query,
            numResults: 5,
            type: 'auto',
            contents: { text: false, highlights: true }
          }),
        }).then(res => ({ type: 'exa', data: res }))
          .catch(err => ({ type: 'error', source: 'Exa.ai', message: err.message }))
      );
    }

    // 4. Reddit Search
    const redditPromise = Promise.resolve().then(async () => {
      let redditContext = '';
      if (mergedKeys.redditClientId && mergedKeys.redditClientSecret) {
        try {
          redditContext = await fetchRedditViaOAuth(query, mergedKeys.redditClientId, mergedKeys.redditClientSecret, registerLink);
        } catch {
          redditContext = await fetchRedditViaSerper(query, mergedKeys.serper, registerLink);
        }
      } else {
        redditContext = await fetchRedditViaSerper(query, mergedKeys.serper, registerLink);
      }
      return { type: 'reddit', data: redditContext };
    });
    promises.push(redditPromise);

    const results = await Promise.all(promises);
    let rawContext = '';

    results.forEach(r => {
      if (r.type === 'error') return;

      if (r.type === 'serper_search') {
        const top = (r.data.organic || []).slice(0, 5);
        rawContext += `[Google Search Organic Results]\n` + 
          top.map(o => `- Título: ${o.title}\n  Snippet: ${o.snippet}\n  Link: ${registerLink(o.link)}`).join('\n') + '\n\n';
      }

      if (r.type === 'serper_shopping') {
        const items = (r.data.shopping || []).slice(0, 5);
        rawContext += `[Google Shopping Deals]\n` + 
          items.map(s => `- Loja: ${s.source}\n  Preço: ${s.price}\n  Título: ${s.title}\n  Link: ${registerLink(s.link)}\n  Thumbnail: ${registerThumb(s.thumbnail)}`).join('\n') + '\n\n';
      }

      if (r.type === 'tavily') {
        rawContext += `[Tavily Contextual Summary]\n${r.data.answer || 'N/A'}\n\n`;
        const snippets = (r.data.results || []).slice(0, 3);
        rawContext += `[Tavily Search Snippets]\n` + 
          snippets.map(t => `- Título: ${t.title}\n  Conteúdo: ${t.content}\n  Link: ${registerLink(t.url)}`).join('\n') + '\n\n';
      }

      if (r.type === 'exa') {
        const exaItems = (r.data.results || []).slice(0, 3);
        rawContext += `[Exa.ai Neural Highlights]\n` + 
          exaItems.map(e => `- Título: ${e.title}\n  Destaque: ${(e.highlights || []).join(' ')}\n  Link: ${registerLink(e.url)}`).join('\n') + '\n\n';
      }

      if (r.type === 'reddit') {
        rawContext += r.data;
      }
    });

    const serperResult = results.find(r => r.type === 'serper_search');
    if (serperResult && serperResult.data?.organic?.length > 0 && (mergedKeys.firecrawl || mergedKeys.diffbot || mergedKeys.scrapeDo)) {
      const topLink = serperResult.data.organic[0].link;
      try {
        let md = '';
        if (mergedKeys.firecrawl) {
          md = await scrapeWithFirecrawl(topLink, mergedKeys.firecrawl);
        } else if (mergedKeys.diffbot) {
          md = await scrapeWithDiffbot(topLink, mergedKeys.diffbot);
        } else if (mergedKeys.scrapeDo) {
          const html = await scrapeWithScrapeDo(topLink, mergedKeys.scrapeDo);
          md = html.replace(/<[^>]*>/g, ' ');
        }
        
        if (md) {
          rawContext += `[Conteúdo Detalhado de Review / Página de Specs Oficial]\nURL: ${registerLink(topLink)}\n\n${md.substring(0, 3000)}\n\n`;
        }
      } catch (err) {
        console.warn('[Proxy] Falha no scraping orgânico:', err.message);
      }
    }

    if (!rawContext.trim()) {
      throw new Error('Nenhuma das APIs de busca (Serper/Tavily/Exa/Reddit) retornou dados reais sobre o equipamento. Por favor, verifique suas chaves e a conexão.');
    }

    let specsRequirements = '';
    if (minSpecs && Object.keys(minSpecs).length > 0) {
      specsRequirements = `REQUISITOS MÍNIMOS EXIGIDOS PELO USUÁRIO:\n` +
        Object.entries(minSpecs).map(([k, v]) => `- ${k}: ${v}`).join('\n') + `\nFiltre ou avalie os resultados de busca e garanta que os modelos de concorrentes ou especificações técnicas atendam ou sejam altamente compatíveis com essas exigências.\n\n`;
    }

    const prompt = `Você é o consolidador técnico de hardware do ecossistema CapIAu-CurIA (2026).
O usuário buscou o equipamento: "${query}".
Modo de busca ativo: "${mode}" (A: Nome, B: Função, C: Lote, E: Preço, F: Troubleshooting, G: Rigs, H: Tendências).
Mecanismo de busca ativo: "${searchApi}".
${specsRequirements}

Consolide os dados brutos da web em um objeto JSON exato de acordo com a tipagem EquipmentData.

Dados coletados da internet:
${rawContext}

REGRAS DE CONSOLIDAÇÃO (ATENÇÃO MÁXIMA):
1. "id": deve ser uma string identificadora única baseada no nome (ex: "${query.toLowerCase().replace(/[^a-z0-9]+/g, '-')}")
2. "name": o nome comercial correto do produto pesquisado (ex: "${query}")
3. "manufacturer": a marca ou fabricante do produto
4. "category": a categoria de equipamento ideal para o produto (ex: "Computadores", "Câmeras", "Lentes", "Áudio", "Iluminação", "Suporte e Rigging", "Monitores e Transmissores", etc.)
5. "specs": objeto contendo chaves e valores de especificações técnicas do produto (ex: {"Processador": "...", "Placa de Vídeo": "...", "Memória": "...", "Montagem": "...", "Sensor": "...", "Resolução Máxima": "..."})
6. "prices": Preencha com as ofertas reais encontradas nos dados coletados.
   - No campo "link", use EXATAMENTE a string identificadora correspondente (ex: "LINK_1", "LINK_2", etc.). NÃO invente links de forma alguma. Se não houver link correspondente nos dados, use "#".
   - No campo "thumbnail", use EXATAMENTE o identificador correspondente (ex: "THUMB_1", "THUMB_2", etc.) ou string vazia "" se não houver.
   - Adicione "warranty" (ex: "12 meses oficial", "Sem garantia").
   - Adicione "totalPrice" (preço + frete, ex: "R$ 15.250").
   - Adicione "isBestDeal": true para a oferta mais barata de loja segura, senão false.
   - Adicione "isLowRisk": true para lojas de renome (ex: Amazon, B&H, Mercado Livre Oficial), senão false.
7. "financials":
   - "breakEvenDays": dias de locação equivalentes (uma locação diária custa em média 1.5% do preço do produto).
   - "residualValue1Yr": valor estimado de revenda após 1 ano (ex: "R$ 12.000 (80%)").
   - "residualValue3Yr": valor estimado após 3 anos.
   - "estimatedDailyCost": custo diário se usado em média 100 dias no ano.
8. "similars": Liste equipamentos similares que sejam ALTERNATIVAS reais de outras marcas ou modelos concorrentes na mesma categoria.
   - É EXPRESSAMENTE PROIBIDO listar manuais, softwares, acessórios, o próprio equipamento pesquisado ou complementos como itens similares.
9. "comparisons": Compare o produto atual com dois concorrentes ou modelos alternativos de outras marcas lado a lado em uma matriz estruturada.
   - É EXPRESSAMENTE PROIBIDO comparar o equipamento com manuais, softwares, acessórios ou variações do próprio produto. Os concorrentes devem ser equipamentos concorrentes reais da mesma faixa de preço ou mais baratos (ex: para Sony FX6, compare com Canon C70 e RED Komodo; NUNCA com manuais ou lentes).
   - Exiba um array de objetos: [{"field": "Preço" | "Sensor/GPU" | "Resolução/Memória" | "Peso" | "Bocal" | "Autonomia", "current": "especificação do atual", "competitor1": "especificação do concorrente A", "competitor2": "especificação do concorrente B"}]
10. "manuals": forneça títulos e links. Se encontrar links de manuais ou reviews nos resultados de busca com os marcadores (ex: "LINK_X"), use-os. Caso contrário, use "#" ou construa uma busca Google segura.

Gere APENAS o JSON puro. Não use blocos de código markdown ou crases (não inclua \`\`\`json). Apenas inicie e finalize com chaves { ... }:`;

    const aiText = await callLLM({ prompt, keys: mergedKeys, model, temperature: 0.2 });
    
    let resultJson = null;
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        resultJson = JSON.parse(jsonMatch[0]);
        resultJson = restoreLinks(resultJson, urlMap, thumbMap);
      } catch {
        throw new Error('Falha de formatação nos dados da IA. Tente fazer a busca novamente.');
      }
    } else {
      throw new Error('A IA não respondeu com um formato estruturado utilizável.');
    }

    return res.json(resultJson);

  } catch (error) {
    console.error('[Proxy] Erro geral de busca:', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor proxy.' });
  }
});

router.post('/plan', async (req, res) => {
  const { query, keys, model } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Consulta vazia.' });
  }

  const mergedKeys = getEffectiveKeys(keys);

  if (!mergedKeys.openRouter && !mergedKeys.googleAi) {
    return res.status(400).json({ error: 'Chave Google AI Studio ou OpenRouter ausente. Pelo menos uma é necessária para planejar.' });
  }

  const prompt = `Você é o Planejador Cognitivo de Hardware do ecossistema CapIAu-CurIA (2026).
Sua missão é receber um pedido do usuário para equipamentos ou setups de gravação audiovisual/TI e convertê-lo em um plano de equipamentos (Rig) estruturado.

O usuário descreveu a necessidade assim: "${query}"

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

  try {
    const aiText = await callLLM({ prompt, keys: mergedKeys, model, temperature: 0.1 });
    
    let resultJson = null;
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        resultJson = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('Falha de formatação no plano da IA.');
      }
    } else {
      throw new Error('A IA não respondeu com um plano de busca estruturado utilizável.');
    }

    return res.json(resultJson);
  } catch (error) {
    console.error('[Proxy] Erro geral de planejamento:', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor proxy durante o planejamento.' });
  }
});

router.post('/chat', async (req, res) => {
  const { messages, keys, model } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Mensagens inválidas ou ausentes.' });
  }

  const mergedKeys = getEffectiveKeys(keys);

  if (!mergedKeys.openRouter && !mergedKeys.googleAi) {
    return res.status(400).json({ error: 'Nenhuma chave de LLM configurada. Adicione Google AI Studio ou OpenRouter na aba Perfil ou defina nas variáveis de ambiente da Vercel.' });
  }

  try {
    const text = await callLLM({ messages, keys: mergedKeys, model, temperature: 0.5 });
    return res.json({
      choices: [{ message: { content: text } }]
    });
  } catch (error) {
    console.error('[Proxy] Erro na requisição de chat:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/api-status', (_req, res) => {
  const merged = getEffectiveKeys({});
  res.json({
    openRouter: !!merged.openRouter,
    googleAi: !!merged.googleAi,
    serper: !!merged.serper,
    tavily: !!merged.tavily,
    exa: !!merged.exa,
    redditClientId: !!merged.redditClientId,
    redditClientSecret: !!merged.redditClientSecret,
    diffbot: !!merged.diffbot,
    firecrawl: !!merged.firecrawl,
    scrapeDo: !!merged.scrapeDo
  });
});

app.use('/api', router);
app.use('/', router);

export default app;
