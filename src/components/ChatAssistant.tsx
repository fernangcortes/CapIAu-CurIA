import React, { useState, useRef, useEffect } from 'react';
import { getLocalKeys, getProxyUrl, getLocalModel, shouldUseGoogleAI, toGoogleModelName } from '../services/apiRouter';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  X, 
  RotateCcw,
  Search,
  Check,
  Zap
} from 'lucide-react';
import { type Filters } from './Sidebar';

interface ChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateFilters: (filters: Partial<Filters>) => void;
  onTriggerSearch: (query: string) => void;
  onUpdateQuery: (query: string) => void;
  onTriggerSetupSearch?: (rigName: string, rigDescription: string, items: { query: string, category: string, reason: string, estimatedBudget: number }[]) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  isError?: boolean;
  pendingAction?: {
    filters?: Partial<Filters>;
    search?: string;
    minSpecs?: Record<string, string>;
    isRig?: boolean;
    rigName?: string;
    rigDescription?: string;
    items?: { query: string, category: string, reason: string, estimatedBudget: number }[];
  };
  actionApplied?: boolean;
}


const apiNames: Record<string, string> = {
  serper: 'Serper.dev Web/Shopping',
  tavily: 'Tavily Search RAG',
  exa: 'Exa.ai Neural Search',
  full: 'Pesquisa Completa (Consolidada)'
};

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ 
  isOpen, 
  onClose, 
  onUpdateFilters, 
  onTriggerSearch,
  onUpdateQuery,
  onTriggerSetupSearch
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'welcome', 
      sender: 'bot', 
      text: 'Olá! Sou o assistente cognitivo **CurIA**. Estou pronto para ajudar você a montar o setup perfeito de câmera, som, luz ou informática de produção.\n\nPosso sugerir filtros, criar especificações mínimas customizadas e preparar buscas avançadas. O que você gostaria de projetar hoje?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Estados locais para edição do card ativo de pesquisa
  const [editingSearch, setEditingSearch] = useState<string>('');
  const [editingFilters, setEditingFilters] = useState<Partial<Filters>>({});
  const [editingMinSpecs, setEditingMinSpecs] = useState<Record<string, string>>({});
  
  // Novos estados para edição de setups (Rigs) propostos
  const [editingRigName, setEditingRigName] = useState<string>('');
  const [editingRigDescription, setEditingRigDescription] = useState<string>('');
  const [editingRigItems, setEditingRigItems] = useState<{ query: string, category: string, reason: string, estimatedBudget: number }[]>([]);
  
  const [activePendingMsgId, setActivePendingMsgId] = useState<string | null>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleApply = (msgId: string) => {
    onUpdateFilters({ ...editingFilters, minSpecs: editingMinSpecs });
    onUpdateQuery(editingSearch);
    
    // Atualiza a mensagem para marcar como aplicada
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionApplied: true } : m));
    setActivePendingMsgId(null);
  };

  const handleApplyAndSearch = (msgId: string) => {
    onUpdateFilters({ ...editingFilters, minSpecs: editingMinSpecs });
    onUpdateQuery(editingSearch);
    onTriggerSearch(editingSearch);
    
    // Atualiza a mensagem para marcar como aplicada
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionApplied: true } : m));
    setActivePendingMsgId(null);
  };

  const handleTriggerSetupSearchClick = (msgId: string) => {
    if (onTriggerSetupSearch) {
      onTriggerSetupSearch(editingRigName, editingRigDescription, editingRigItems);
    }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionApplied: true } : m));
    setActivePendingMsgId(null);
  };

  const handleRemoveRigItem = (index: number) => {
    setEditingRigItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddRigItem = () => {
    setEditingRigItems(prev => [
      ...prev,
      { query: 'Novo Equipamento', category: 'Câmeras', reason: 'Adicionado manualmente pelo produtor.', estimatedBudget: 500 }
    ]);
  };

  const handleUpdateRigItemQuery = (index: number, val: string) => {
    setEditingRigItems(prev => prev.map((item, i) => i === index ? { ...item, query: val } : item));
  };

  const handleUpdateRigItemBudget = (index: number, val: number) => {
    setEditingRigItems(prev => prev.map((item, i) => i === index ? { ...item, estimatedBudget: val } : item));
  };

  const handleUpdateRigItemCategory = (index: number, val: string) => {
    setEditingRigItems(prev => prev.map((item, i) => i === index ? { ...item, category: val } : item));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const userText = input.trim();
    if (!userText) return;

    // 1. Adicionar mensagem do usuário
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    const keys = getLocalKeys();
    const proxyUrl = getProxyUrl();
    const model = getLocalModel();
    const hasOpenRouterKey = !!keys.openRouter;
    const hasProxy = !!proxyUrl;

    try {
      let botResponse = '';

      if (!hasOpenRouterKey && !keys.googleAi && !hasProxy) {
        // NÃO HÁ CHAVES: Exibe erro explícito
        throw new Error('Chave API do Google AI Studio ou OpenRouter ausente. Cadastre pelo menos uma na aba Perfil para falar com a CurIA.');
      }

      // MODO CONECTADO (OPENROUTER OU PROXY)
      let responseJson: any = null;

      const systemPrompt = `Você é a CurIA, o assistente cognitivo especialista do ecossistema CapIAu-CurIA.
Sua missão é atuar como um verdadeiro assistente de compras inteligente e interativo para equipamentos audiovisuais e tecnologia de produção.

Regras de Interação e Fluxo de Conversação:
1. NÃO seja excessivamente estático ou mecânico. Embora o Dossiê e o Dashboard mostrem as fichas técnicas completas, você deve usar a conversa de forma criativa e proativa para entender melhor a necessidade do usuário.
2. Em vez de se limitar estritamente a 1 ou 2 frases curtas, sinta-se livre para elaborar perguntas de esclarecimento ou dar dicas inteligentes quando achar necessário.
3. Faça perguntas ativas para guiar o usuário. Por exemplo:
   - Se o usuário estiver montando um computador para edição ou IA, pergunte se ele tem preferência de marca (ex: Apple vs PC customizado), se precisa de placa de vídeo NVIDIA (crucial para IA local) ou qual o tamanho do armazenamento.
   - Pergunte qual API de busca ele gostaria de usar para o caso específico (ex: Serper.dev para preços reais, Tavily para resumos RAG, Exa.ai para links neurais ou Pesquisa Completa para consolidar tudo).
4. Sugira Categorias Dinâmicas: Você pode sugerir qualquer categoria relevante na tag de controle. Se o item for um computador, defina a categoria como "Computadores". Se for um drone, "Drones". Se for um estabilizador, "Estabilizadores". A interface do programa irá criar e registrar essa categoria dinamicamente!
5. Quando tiver uma proposta de busca ou setup pronta para o usuário testar, inclua no final da sua resposta (na última linha, sem markdown, sem crase) a tag de controle correspondente:

Caso A: Se for a busca por um ÚNICO equipamento específico:
[CONTROL: {"filters": {"category": "Categoria Sugerida (ex: 'Computadores', 'Câmeras', 'Lentes' ou customizada)", "manufacturer": "Sony" | "Canon" | "RED" | "NVIDIA" | "Apple" | "All" | "qualquer marca", "maxPrice": number, "usePriceFilter": boolean, "mount": "E-mount" | "RF-mount" | "PL-mount" | "EF-mount" | "All" | "qualquer bocal", "resolution": "8K" | "6K" | "4K" | "1080p" | "All", "searchApi": "serper" | "tavily" | "exa" | "full", "minSpecs": {"Nome do Requisito": "Valor Exigido"}}, "search": "termo de pesquisa refinado"}]

Caso B: Se o usuário estiver montando um SETUP / KIT / RIG contendo múltiplos equipamentos (ex: "kit para podcast de 2 pessoas", "setup de iluminação externa", ou se ele pedir sugestões para um tipo de projeto):
[CONTROL: {"rigName": "Nome do Setup Sugerido (ex: 'Setup Podcast Dual Mic')", "rigDescription": "Descrição curta do objetivo do Rig em português", "items": [{"query": "Termo de pesquisa exato do equipamento (ex: 'Rode NT-USB')", "category": "Câmeras" | "Lentes" | "Áudio" | "Iluminação" | "Suporte e Rigging" | "Monitores e Transmissores", "reason": "Motivo da escolha do item em linguagem simples", "estimatedBudget": 300}]}]

Você decide a quantidade de equipamentos de acordo com a necessidade (pode variar de 2 a 5 ou mais). Não crie listas desnecessariamente longas; priorize o essencial de alta utilidade prática.`;

      // Criar AbortController para timeout
      const controller = new AbortController();

      if (hasProxy) {
        console.log('[Chatbot] Enviando requisição de chat para o proxy...');
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        
        try {
          const chatRes = await fetch(`${proxyUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
                { role: 'user', content: userText }
              ],
              keys,
              model
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (!chatRes.ok) {
            throw new Error(`Erro no servidor proxy chat status ${chatRes.status}`);
          }
          const chatData = await chatRes.json();
          botResponse = chatData.choices?.[0]?.message?.content || '';
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            throw new Error('A conexão com o servidor proxy expirou (limite de 45s atingido).');
          }
          throw err;
        }

      } else if (shouldUseGoogleAI(keys, model)) {
        // CHAMADA DIRETA: Google AI Studio (sem proxy)
        console.log('[Chatbot] 🚀 Chamando Google AI Studio diretamente...');
        const timeoutId = setTimeout(() => controller.abort(), 35000);
        
        const googleModel = toGoogleModelName(model).replace(':free', '');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${keys.googleAi}`;

        // Construir histórico de chat sem system prompt no contents
        const contents = [
          ...messages.filter(m => m.id !== 'welcome').map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          })),
          { role: 'user', parts: [{ text: userText }] }
        ];

        try {
          const googleRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              systemInstruction: {
                parts: [{ text: systemPrompt }]
              },
              generationConfig: { temperature: 0.5, maxOutputTokens: 4096 }
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (!googleRes.ok) {
            const errText = await googleRes.text();
            throw new Error(`Erro na API Google AI: ${googleRes.status} — ${errText}`);
          }
          const googleJson = await googleRes.json();
          botResponse = googleJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (err: any) {
          clearTimeout(timeoutId);
          console.warn('Falha na chamada direta do Google AI Studio:', err);
          if (keys.openRouter) {
            console.log('Tentando fallback via OpenRouter...');
            const fallbackTimeoutId = setTimeout(() => controller.abort(), 45000);
            try {
              const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${keys.openRouter}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: model,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
                    { role: 'user', content: userText }
                  ],
                  temperature: 0.5
                }),
                signal: controller.signal
              });
              clearTimeout(fallbackTimeoutId);

              if (!openRouterRes.ok) {
                throw new Error(`Erro na API do OpenRouter status ${openRouterRes.status}`);
              }
              responseJson = await openRouterRes.json();
              botResponse = responseJson.choices?.[0]?.message?.content || '';
            } catch (fallbackErr: any) {
              clearTimeout(fallbackTimeoutId);
              if (fallbackErr.name === 'AbortError') {
                throw new Error('A conexão com a API do OpenRouter expirou durante o fallback.');
              }
              throw new Error(`Erro na API Google AI (${err.message}) e no fallback do OpenRouter (${fallbackErr.message})`);
            }
          } else {
            if (err.name === 'AbortError') {
              throw new Error('A conexão com a API do Google AI Studio expirou (limite de 35s atingido).');
            }
            throw err;
          }
        }

      } else {
        console.log('[Chatbot] Chamando OpenRouter diretamente...');
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        try {
          const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${keys.openRouter}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
                { role: 'user', content: userText }
              ],
              temperature: 0.5
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (!openRouterRes.ok) {
            throw new Error(`Erro na API do OpenRouter status ${openRouterRes.status}`);
          }
          responseJson = await openRouterRes.json();
          botResponse = responseJson.choices?.[0]?.message?.content || '';
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            throw new Error('A conexão com a API do OpenRouter expirou (limite de 45s atingido).');
          }
          throw err;
        }
      }

      // 4. Processar resposta e extrair tag de controle se houver (via balanceamento de colchetes para suportar arrays aninhados)
      let cleanText = botResponse;
      let pendingAction: any = undefined;

      const controlStartIndex = botResponse.indexOf('[CONTROL:');
      if (controlStartIndex !== -1) {
        let bracketCount = 0;
        let controlEndIndex = -1;
        
        for (let i = controlStartIndex; i < botResponse.length; i++) {
          if (botResponse[i] === '[') {
            bracketCount++;
          } else if (botResponse[i] === ']') {
            bracketCount--;
            if (bracketCount === 0) {
              controlEndIndex = i;
              break;
            }
          }
        }

        if (controlEndIndex !== -1) {
          const fullControlTag = botResponse.substring(controlStartIndex, controlEndIndex + 1);
          // Extrair o conteúdo do JSON contido nos limites da primeira chave '{' e da última chave '}'
          const firstBrace = fullControlTag.indexOf('{');
          const lastBrace = fullControlTag.lastIndexOf('}');
          
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const jsonContent = fullControlTag.substring(firstBrace, lastBrace + 1);
            
            try {
              const cleanJsonStr = jsonContent
                .replace(/[\u200B-\u200D\uFEFF]/g, '')
                .replace(/\xa0/g, ' ')
                .trim();
                
              const controlData = JSON.parse(cleanJsonStr);
              console.log('[Chatbot] Comando de Controle detectado (JSON válido):', controlData);
              
              cleanText = (botResponse.substring(0, controlStartIndex) + botResponse.substring(controlEndIndex + 1)).trim();
              pendingAction = {
                filters: controlData.filters,
                search: controlData.search,
                minSpecs: controlData.filters?.minSpecs || controlData.minSpecs,
                isRig: !!controlData.items || !!controlData.rigName,
                rigName: controlData.rigName || '',
                rigDescription: controlData.rigDescription || '',
                items: controlData.items || []
              };
            } catch (err) {
              console.warn('[Chatbot] Erro no JSON.parse padrão, tentando parser resiliente...', err);
              
              try {
                const relaxedStr = jsonContent
                  .replace(/'/g, '"')
                  .replace(/,\s*([\]}])/g, '$1')
                  .replace(/[\u200B-\u200D\uFEFF]/g, '')
                  .replace(/\xa0/g, ' ')
                  .trim();
                  
                const controlData = JSON.parse(relaxedStr);
                console.log('[Chatbot] Comando de Controle detectado (JSON corrigido):', controlData);
                
                cleanText = (botResponse.substring(0, controlStartIndex) + botResponse.substring(controlEndIndex + 1)).trim();
                pendingAction = {
                  filters: controlData.filters,
                  search: controlData.search,
                  minSpecs: controlData.filters?.minSpecs || controlData.minSpecs,
                  isRig: !!controlData.items || !!controlData.rigName,
                  rigName: controlData.rigName || '',
                  rigDescription: controlData.rigDescription || '',
                  items: controlData.items || []
                };
              } catch (err2) {
                console.error('[Chatbot] JSON de controle completamente ilegível para a UI:', err2);
                cleanText = (botResponse.substring(0, controlStartIndex) + botResponse.substring(controlEndIndex + 1)).trim();
              }
            }
          }
        }
      }

      const newMsgId = Date.now().toString();
      setMessages(prev => [...prev, { 
        id: newMsgId, 
        sender: 'bot', 
        text: cleanText,
        pendingAction
      }]);

      if (pendingAction) {
        setEditingSearch(pendingAction.search || '');
        // RemoveminSpecs dos filtros locais de edição para manter limpo
        const cleanedFilters = { ...pendingAction.filters };
        delete cleanedFilters.minSpecs;

        setEditingFilters(cleanedFilters || {});
        setEditingMinSpecs(pendingAction.minSpecs || {});
        setEditingRigName(pendingAction.rigName || '');
        setEditingRigDescription(pendingAction.rigDescription || '');
        setEditingRigItems(pendingAction.items || []);
        setActivePendingMsgId(newMsgId);
      }

    } catch (error: any) {
      console.error('[Chatbot] Erro ao obter resposta:', error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        sender: 'bot', 
        text: `Falha de Conexão: ${error.message || 'Erro Desconhecido'}. Por favor, verifique suas chaves de API.`,
        isError: true 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      { 
        id: 'welcome', 
        sender: 'bot', 
        text: 'Chat resetado. Olá! Sou o assistente cognitivo **CurIA**. Estou pronto para auxiliar você com a busca técnica e seleção de equipamentos. O que vamos projetar hoje?' 
      }
    ]);
    setActivePendingMsgId(null);
  };

  return (
    <div className="chat-assistant-panel">
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={18} className="text-gray-400" />
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Assistente CurIA</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Especialista em Compras AV</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            onClick={handleResetChat} 
            className="sidebar-toggle-btn" 
            style={{ padding: '6px' }}
            title="Resetar Chat"
          >
            <RotateCcw size={14} />
          </button>
          <button 
            onClick={onClose} 
            className="sidebar-toggle-btn" 
            style={{ padding: '6px' }}
            title="Fechar Chat"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((m) => {
          const pendingAction = m.pendingAction;
          const isCurrentPending = m.id === activePendingMsgId && !m.actionApplied;

          return (
            <div key={m.id} className={`chat-bubble-container ${m.sender}`} style={{ maxWidth: '90%' }}>
              <div className="chat-avatar">
                {m.sender === 'bot' ? <Bot size={14} /> : <UserIcon size={14} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <div className={`chat-bubble ${m.isError ? 'error' : ''}`}>
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{m.text}</p>
                </div>
                
                {pendingAction && pendingAction.isRig ? (
                  <div className="rig-proposal-container">
                    <div className="rig-proposal-header">
                      <Zap size={14} style={{ color: 'var(--star-color)' }} />
                      <span>{isCurrentPending ? (
                        <input 
                          type="text" 
                          className="rig-item-title-input" 
                          value={editingRigName}
                          onChange={(e) => setEditingRigName(e.target.value)}
                          placeholder="Nome do Setup / Rig"
                          style={{ fontSize: '0.88rem', fontWeight: 600 }}
                        />
                      ) : (
                        pendingAction.rigName
                      )}</span>
                    </div>

                    {pendingAction.rigDescription && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0 8px 0', fontStyle: 'italic' }}>
                        {isCurrentPending ? (
                          <input 
                            type="text" 
                            className="rig-item-title-input" 
                            value={editingRigDescription}
                            onChange={(e) => setEditingRigDescription(e.target.value)}
                            placeholder="Descrição do Rig"
                            style={{ fontSize: '0.75rem', fontStyle: 'italic', fontWeight: 'normal' }}
                          />
                        ) : (
                          pendingAction.rigDescription
                        )}
                      </p>
                    )}

                    <div className="rig-items-list">
                      {(isCurrentPending ? editingRigItems : pendingAction.items || []).map((item, idx) => (
                        <div key={idx} className="rig-item-card">
                          <div className="rig-item-card-row">
                            {isCurrentPending ? (
                              <input 
                                type="text"
                                className="rig-item-title-input"
                                value={item.query}
                                onChange={(e) => handleUpdateRigItemQuery(idx, e.target.value)}
                              />
                            ) : (
                              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.query}</span>
                            )}
                            
                            {isCurrentPending ? (
                              <button 
                                type="button" 
                                className="rig-item-delete-btn"
                                onClick={() => handleRemoveRigItem(idx)}
                              >
                                <X size={12} />
                              </button>
                            ) : (
                              <span className="rig-item-badge">{item.category}</span>
                            )}
                          </div>

                          {isCurrentPending && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <select 
                                className="input-field" 
                                value={item.category} 
                                onChange={(e) => handleUpdateRigItemCategory(idx, e.target.value)}
                                style={{ padding: '2px 4px', fontSize: '0.7rem', height: '22px', width: 'auto' }}
                              >
                                <option value="Câmeras">Câmeras</option>
                                <option value="Lentes">Lentes</option>
                                <option value="Áudio">Áudio</option>
                                <option value="Iluminação">Iluminação</option>
                                <option value="Suporte e Rigging">Suporte e Rigging</option>
                                <option value="Monitores e Transmissores">Monitores/Conectividade</option>
                              </select>
                            </div>
                          )}

                          {item.reason && (
                            <p className="rig-item-reason">{item.reason}</p>
                          )}

                          <div className="rig-item-budget-row">
                            <span style={{ color: 'var(--text-muted)' }}>Orçamento Sugerido:</span>
                            {isCurrentPending ? (
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>$</span>
                                <input 
                                  type="number"
                                  className="rig-item-budget-input"
                                  value={item.estimatedBudget}
                                  onChange={(e) => handleUpdateRigItemBudget(idx, Number(e.target.value))}
                                />
                              </div>
                            ) : (
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>${item.estimatedBudget}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {isCurrentPending && (
                      <button 
                        type="button" 
                        className="rig-add-item-btn"
                        onClick={handleAddRigItem}
                      >
                        + Adicionar Equipamento
                      </button>
                    )}

                    <div style={{ display: 'flex', marginTop: '6px' }}>
                      {m.actionApplied ? (
                        <button
                          disabled={true}
                          className="btn"
                          style={{
                            padding: '8px 12px',
                            fontSize: '0.8rem',
                            justifyContent: 'center',
                            width: '100%',
                            borderRadius: '4px'
                          }}
                        >
                          <Check size={14} style={{ color: '#4ade80' }} />
                          <span style={{ color: '#4ade80' }}>Setup Buscado e Salvo como Rig</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTriggerSetupSearchClick(m.id)}
                          className="btn primary"
                          style={{
                            padding: '8px 12px',
                            fontSize: '0.75rem',
                            justifyContent: 'center',
                            width: '100%',
                            borderRadius: '4px'
                          }}
                        >
                          <Search size={12} />
                          <span>Buscar Setup e Criar Rig</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : pendingAction && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.8rem',
                    marginTop: '4px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                      <Search size={12} style={{ color: 'var(--accent)' }} />
                      <span>Proposta de Pesquisa Inteligente</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {/* Termo de Pesquisa */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Termo de Pesquisa:</span>
                        {isCurrentPending ? (
                          <input 
                            type="text" 
                            className="input-field" 
                            value={editingSearch} 
                            onChange={(e) => setEditingSearch(e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '0.8rem', height: '28px', margin: 0 }}
                          />
                        ) : (
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)', padding: '2px 0' }}>
                            "{pendingAction.search}"
                          </span>
                        )}
                      </div>
                      
                      {/* Filtros Básicos */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px', marginTop: '2px' }}>
                        {/* Categoria */}
                        {(isCurrentPending ? editingFilters.category : pendingAction.filters?.category) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Categoria:</span>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                              {isCurrentPending ? editingFilters.category : pendingAction.filters?.category}
                            </span>
                          </div>
                        )}
                        {/* Fabricante */}
                        {(isCurrentPending ? editingFilters.manufacturer : pendingAction.filters?.manufacturer) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Marca:</span>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                              {isCurrentPending ? editingFilters.manufacturer : pendingAction.filters?.manufacturer}
                            </span>
                          </div>
                        )}
                        {/* API de busca */}
                        {(isCurrentPending ? editingFilters.searchApi : pendingAction.filters?.searchApi) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>API:</span>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                              {apiNames[(isCurrentPending ? editingFilters.searchApi : pendingAction.filters?.searchApi) as string] || (isCurrentPending ? editingFilters.searchApi : pendingAction.filters?.searchApi)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Especificações Mínimas */}
                      {((isCurrentPending ? Object.keys(editingMinSpecs).length > 0 : pendingAction.minSpecs && Object.keys(pendingAction.minSpecs).length > 0)) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px', marginTop: '2px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>Specs Mínimos Desejados:</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {isCurrentPending ? (
                              Object.entries(editingMinSpecs).map(([key, val]) => (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{key}:</span>
                                  <input 
                                    type="text" 
                                    className="input-field" 
                                    value={val} 
                                    onChange={(e) => setEditingMinSpecs(prev => ({ ...prev, [key]: e.target.value }))}
                                    style={{ width: '120px', padding: '2px 6px', fontSize: '0.75rem', height: '22px', margin: 0 }}
                                  />
                                </div>
                              ))
                            ) : (
                              Object.entries(pendingAction.minSpecs || {}).map(([key, val]) => (
                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{key}:</span>
                                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{val}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Botões de Ação */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      {m.actionApplied ? (
                        <button
                          disabled={true}
                          className="btn"
                          style={{
                            padding: '8px 12px',
                            fontSize: '0.8rem',
                            justifyContent: 'center',
                            width: '100%',
                            borderRadius: '4px'
                          }}
                        >
                          <Check size={14} style={{ color: '#4ade80' }} />
                          <span style={{ color: '#4ade80' }}>Pesquisa Aplicada</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApply(m.id)}
                            className="btn"
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.75rem',
                              justifyContent: 'center',
                              flex: 1,
                              borderRadius: '4px'
                            }}
                          >
                            Aplicar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyAndSearch(m.id)}
                            className="btn primary"
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.75rem',
                              justifyContent: 'center',
                              flex: 1.2,
                              borderRadius: '4px'
                            }}
                          >
                            <Search size={12} />
                            <span>Aplicar e Buscar</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="chat-bubble-container bot">
            <div className="chat-avatar">
              <Bot size={14} />
            </div>
            <div className="chat-bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="chat-input-area">
        <input 
          type="text" 
          placeholder="Peça sugestões ou peça para buscar..." 
          className="input-field" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          style={{ borderRadius: '4px 0 0 4px', borderRight: 'none', margin: 0 }}
        />
        <button 
          type="submit" 
          className="btn primary" 
          disabled={loading || !input.trim()}
          style={{ borderRadius: '0 4px 4px 0', padding: '0 16px' }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
