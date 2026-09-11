import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FavoriteEquipment } from '../db/localDatabase';
import { searchEquipment, planRig, type EquipmentData } from '../services/apiRouter';
import { type Filters } from './Sidebar';
import { 
  Search, 
  AlertCircle,
  Eye, 
  SlidersHorizontal,
  Camera,
  Film,
  Zap,
  Star,
  MessageSquare,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface DashboardProps {
  filters: Filters;
  onOpenEquipment: (equipment: EquipmentData | FavoriteEquipment) => void;
  triggerSearchRef: React.MutableRefObject<((query: string) => void) | null>;
  triggerSetupSearchRef?: React.MutableRefObject<((rigName: string, rigDescription: string, items: { query: string, category: string, reason: string, estimatedBudget: number }[]) => void) | null>;
  setQueryRef: React.MutableRefObject<((query: string) => void) | null>;
  isChatOpen: boolean;
  onToggleChat: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  filters, 
  onOpenEquipment, 
  triggerSearchRef,
  triggerSetupSearchRef,
  setQueryRef,
  isChatOpen,
  onToggleChat
}) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('A'); // A: Modelo, B: Função, C: Serial, F: Troubleshoot
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para o Planejador Cognitivo e Busca Sequencial de Rigs
  const [planningState, setPlanningState] = useState<'idle' | 'planning' | 'searching' | 'done'>('idle');
  const [thinkingSteps, setThinkingSteps] = useState<{ id: string; label: string; status: 'pending' | 'active' | 'completed' }[]>([]);
  const [currentSearchItem, setCurrentSearchItem] = useState<string>('');

  // Lista de resultados de busca nesta sessão
  const [searchResults, setSearchResults] = useState<{ data: EquipmentData }[]>([]);

  // Carregar favoritos para a página inicial
  const favorites = useLiveQuery(() => db.favorites.toArray()) || [];

  const executeRigSearch = async (
    rigName: string, 
    rigDescription: string, 
    items: { query: string, category: string, reason: string, estimatedBudget: number }[]
  ) => {
    if (!items || items.length === 0) return;
    
    setPlanningState('searching');
    setError('');
    
    const initialSteps = [
      { id: 'plan_decomp', label: 'Analisar e estruturar o plano do Rig', status: 'completed' as const },
      ...items.map((item, idx) => ({
        id: `search_item_${idx}`,
        label: `Pesquisar especificações e ofertas de: "${item.query}"`,
        status: 'pending' as const
      })),
      { id: 'save_rig', label: 'Agrupar e salvar Novo Rig no banco local', status: 'pending' as const }
    ];
    setThinkingSteps(initialSteps);
    
    const resultsList: EquipmentData[] = [];
    
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (i > 0) {
          // Pequeno intervalo para evitar estourar o limite de taxa (Rate Limit 15 RPM) do Gemini grátis
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        setCurrentSearchItem(item.query);
        
        setThinkingSteps(prev => prev.map(step => 
          step.id === `search_item_${i}` ? { ...step, status: 'active' as const } : step
        ));
        
        try {
          const result = await searchEquipment(item.query, 'A', filters.searchApi, filters.minSpecs);
          resultsList.push(result.data);
          
          await db.favorites.put({
            ...result.data,
            stars: 4,
            dateAdded: Date.now(),
            notes: `Equipamento do setup: ${rigName}. ${item.reason}`
          });
          
          setSearchResults(prev => {
            const filtered = prev.filter(r => r.data.id !== result.data.id);
            return [result, ...filtered];
          });
          
        } catch (err: any) {
          console.warn(`[Dashboard] Falha ao buscar item do Rig: ${item.query}. Ignorando...`, err);
        }
        
        setThinkingSteps(prev => prev.map(step => 
          step.id === `search_item_${i}` ? { ...step, status: 'completed' as const } : step
        ));
      }
      
      setThinkingSteps(prev => prev.map(step => 
        step.id === 'save_rig' ? { ...step, status: 'active' as const } : step
      ));
      
      const itemIds = resultsList.map(r => r.id);
      
      if (itemIds.length > 0) {
        await db.rigs.put({
          id: rigName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name: rigName,
          description: rigDescription,
          items: itemIds,
          dateCreated: Date.now()
        });
      }
      
      setThinkingSteps(prev => prev.map(step => 
        step.id === 'save_rig' ? { ...step, status: 'completed' as const } : step
      ));
      
      setPlanningState('done');
      setTimeout(() => setPlanningState('idle'), 2500);
      
      if (resultsList.length > 0) {
        onOpenEquipment(resultsList[0]);
      }
      
    } catch (err: any) {
      setError(err.message || 'Erro ao orquestrar a busca do Rig.');
      setPlanningState('idle');
    }
  };

  const handleSearch = async (searchQuery: string = query) => {
    const targetQuery = searchQuery.trim();
    if (!targetQuery) return;

    setLoading(true);
    setError('');
    
    // Se o usuário estiver fazendo uma busca geral / subjetiva (ex: modo B), 
    // ativamos o planejador cognitivo para estruturar a busca.
    if (mode === 'B') {
      setPlanningState('planning');
      setThinkingSteps([
        { id: 'plan_decomp', label: 'Planejador Cognitivo: Interpretando intenção do usuário...', status: 'active' },
        { id: 'search_items', label: 'Decompor e buscar equipamentos indicados', status: 'pending' }
      ]);

      try {
        const plan = await planRig(targetQuery);
        
        if (plan.isRig && plan.items.length > 0) {
          // Se for detectado um setup, executa a busca do Rig estruturado
          await executeRigSearch(plan.rigName, plan.rigDescription, plan.items);
        } else {
          // Se for detectado apenas um item, busca normalmente o termo refinado pela IA
          const refinedQuery = plan.items[0]?.query || targetQuery;
          setPlanningState('searching');
          setThinkingSteps([
            { id: 'plan_decomp', label: 'Planejador Cognitivo: Interpretando intenção do usuário...', status: 'completed' },
            { id: 'search_single', label: `Pesquisando specs de: "${refinedQuery}"`, status: 'active' }
          ]);

          const result = await searchEquipment(refinedQuery, mode, filters.searchApi, filters.minSpecs);
          
          await db.searchHistory.add({
            query: targetQuery,
            timestamp: Date.now(),
            resultsCount: 1,
            mode
          });

          setSearchResults(prev => {
            const filtered = prev.filter(item => item.data.id !== result.data.id);
            return [result, ...filtered];
          });

          setPlanningState('done');
          setTimeout(() => setPlanningState('idle'), 1500);
          onOpenEquipment(result.data);
        }
      } catch (err: any) {
        console.error('[Dashboard] Erro no planejamento cognitivo, executando busca padrão:', err);
        // Fallback para busca direta sem planejamento em caso de falha do LLM
        setPlanningState('idle');
        try {
          const result = await searchEquipment(targetQuery, mode, filters.searchApi, filters.minSpecs);
          setSearchResults(prev => {
            const filtered = prev.filter(item => item.data.id !== result.data.id);
            return [result, ...filtered];
          });
          onOpenEquipment(result.data);
        } catch (searchErr: any) {
          setError(searchErr.message || 'Erro ao realizar a busca.');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Busca padrão de único equipamento (modos diferentes de 'B')
    try {
      const result = await searchEquipment(targetQuery, mode, filters.searchApi, filters.minSpecs);
      
      await db.searchHistory.add({
        query: targetQuery,
        timestamp: Date.now(),
        resultsCount: 1,
        mode
      });

      setSearchResults(prev => {
        const filtered = prev.filter(item => item.data.id !== result.data.id);
        return [result, ...filtered];
      });

      onOpenEquipment(result.data);

    } catch (err: any) {
      setError(err.message || 'Erro ao realizar a busca.');
    } finally {
      setLoading(false);
    }
  };

  // Expor a função de busca de Rig para o triggerSetupSearchRef
  React.useEffect(() => {
    if (triggerSetupSearchRef) {
      triggerSetupSearchRef.current = (rigName, rigDescription, items) => {
        executeRigSearch(rigName, rigDescription, items);
      };
    }
  }, [triggerSetupSearchRef, filters]);

  // Expor a função de busca para a Sidebar (Histórico)
  React.useEffect(() => {
    triggerSearchRef.current = (q: string) => {
      setQuery(q);
      handleSearch(q);
    };
  }, [mode, filters]);

  // Expor a função de atualizar a query sem buscar
  React.useEffect(() => {
    setQueryRef.current = (q: string) => {
      setQuery(q);
    };
  }, []);

  const parsePrice = (priceStr: string): number => {
    // Extrai apenas os números da string de preço ($2.498 -> 2498, R$ 13.500 -> 13500)
    const cleaned = priceStr.replace(/\./g, '').replace(/,/g, '').replace(/[^0-9]/g, '');
    const num = Number(cleaned);
    // Se o valor estiver em BRL (geralmente maior que em USD), ajusta a proporção para filtro USD
    if (priceStr.includes('R$')) {
      return num / 5.5; // câmbio aproximado de $1 = R$ 5.5
    }
    return num;
  };

  // Filtragem local dos resultados e dos favoritos
  const filterItem = (item: EquipmentData | FavoriteEquipment) => {
    // 1. Filtro de Categoria
    if (filters.category !== 'All') {
      if (item.category !== filters.category) {
        return false;
      }
    }

    // 2. Filtro de Fabricante
    if (filters.manufacturer !== 'All') {
      if (item.manufacturer.toLowerCase() !== filters.manufacturer.toLowerCase()) {
        return false;
      }
    }

    // 3. Filtro de Bocal (Lens Mount) - Somente se relevante
    if (filters.mount !== 'All' && (item.category === 'Câmeras' || item.category === 'Lentes')) {
      const mountSpec = item.specs['Montagem'] || item.specs['Montagem de Encaixe'] || '';
      if (!mountSpec.toLowerCase().includes(filters.mount.toLowerCase())) {
        return false;
      }
    }

    // 4. Filtro de Resolução - Somente se relevante
    if (filters.resolution !== 'All' && item.category === 'Câmeras') {
      const resolutionSpec = item.specs['Gravação Interna'] || item.specs['Resolução Máxima'] || '';
      if (!resolutionSpec.toLowerCase().includes(filters.resolution.toLowerCase())) {
        return false;
      }
    }

    // 5. Filtro de Orçamento Opcional
    if (filters.usePriceFilter && item.prices && item.prices.length > 0) {
      const priceVal = parsePrice(item.prices[0].price);
      if (priceVal > filters.maxPrice) {
        return false;
      }
    }

    // 6. Filtros específicos de Câmeras
    if (item.category === 'Câmeras') {
      if (filters.sensorSize !== 'All') {
        const sensorSpec = item.specs['Sensor'] || '';
        if (!sensorSpec.toLowerCase().includes(filters.sensorSize.toLowerCase())) {
          return false;
        }
      }
      if (filters.logProfile !== 'All') {
        const logSpec = item.specs['Gravação Interna'] || '';
        if (!logSpec.toLowerCase().includes(filters.logProfile.toLowerCase())) {
          return false;
        }
      }
      if (filters.hasNd) {
        const summaryText = (item.dossier?.summary || '').toLowerCase();
        const prosText = (item.dossier?.pros || []).join(' ').toLowerCase();
        const hasNdText = summaryText.includes('nd') || prosText.includes('nd');
        if (!hasNdText) return false;
      }
    }

    // 7. Filtros específicos de Lentes
    if (item.category === 'Lentes') {
      if (filters.lensType !== 'All') {
        const focalSpec = item.specs['Distância Focal'] || '';
        if (!focalSpec.toLowerCase().includes(filters.lensType.toLowerCase())) {
          return false;
        }
      }
      if (filters.maxAperture !== 'All') {
        const apertureSpec = item.specs['Abertura Máxima'] || '';
        if (!apertureSpec.toLowerCase().includes(filters.maxAperture.toLowerCase())) {
          return false;
        }
      }
      if (filters.hasStabilization) {
        const specsText = Object.values(item.specs).join(' ').toLowerCase();
        if (!specsText.includes('estabiliz') && !specsText.includes('ibis')) {
          return false;
        }
      }
    }

    // 8. Filtros específicos de Áudio
    if (item.category === 'Áudio') {
      if (filters.audioType !== 'All') {
        const typeSpec = item.specs['Tipo de Transdutor'] || item.category || '';
        if (!typeSpec.toLowerCase().includes(filters.audioType.toLowerCase()) && !item.name.toLowerCase().includes(filters.audioType.toLowerCase())) {
          return false;
        }
      }
      if (filters.audioConnector !== 'All') {
        const connSpec = item.specs['Saída'] || '';
        if (!connSpec.toLowerCase().includes(filters.audioConnector.toLowerCase())) {
          return false;
        }
      }
      if (filters.polarPattern !== 'All') {
        const polarSpec = item.specs['Padrão Polar'] || '';
        if (!polarSpec.toLowerCase().includes(filters.polarPattern.toLowerCase())) {
          return false;
        }
      }
    }

    // 9. Filtros específicos de Iluminação
    if (item.category === 'Iluminação') {
      if (filters.lightType !== 'All') {
        const specsText = Object.values(item.specs).join(' ').toLowerCase();
        if (!specsText.includes(filters.lightType.toLowerCase()) && !item.name.toLowerCase().includes(filters.lightType.toLowerCase())) {
          return false;
        }
      }
      if (filters.lightTemp !== 'All') {
        const specsText = Object.values(item.specs).join(' ').toLowerCase();
        if (!specsText.includes(filters.lightTemp.toLowerCase())) {
          return false;
        }
      }
    }

    return true;
  };

  const filteredResults = searchResults.filter(r => filterItem(r.data));
  const filteredFavorites = favorites.filter(filterItem);

  return (
    <div className="main-content" style={{ position: 'relative' }}>
      {/* Planejador Cognitivo Overlay (Thinking Timeline) */}
      {planningState !== 'idle' && (
        <div className="thinking-overlay">
          <div className="thinking-container">
            <div className="thinking-header">
              {planningState === 'done' ? (
                <CheckCircle size={28} style={{ color: '#4ade80' }} />
              ) : (
                <Loader2 size={28} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--accent-hover)' }} />
              )}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                  {planningState === 'planning' ? 'Planejador Cognitivo' : planningState === 'searching' ? 'Orquestrando Rigs & APIs' : 'Busca Concluída!'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {planningState === 'planning' ? 'Analisando linguagem natural e roteando APIs...' : planningState === 'searching' ? `Buscando specs e sentimentos para: "${currentSearchItem}"` : 'Setup agrupado e salvo com sucesso no banco de dados local.'}
                </span>
              </div>
            </div>

            <div className="thinking-steps-list">
              {thinkingSteps.map((step) => (
                <div key={step.id} className={`thinking-step ${step.status}`}>
                  <div className="step-indicator">
                    {step.status === 'completed' ? (
                      <CheckCircle size={14} style={{ color: '#4ade80' }} />
                    ) : step.status === 'active' ? (
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-primary)' }} />
                    ) : (
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header do Painel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.5px', margin: 0, color: 'var(--text-primary)' }}>
            CapIAu-CurIA
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Central Inteligente de Pesquisa e Dossiê de Equipamentos Audiovisuais (2026)
          </p>
        </div>

        {/* Info do status de conexões das APIs */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="active-api-badge" style={{ fontSize: '0.7rem' }}>
            Base Local Dexie: OK
          </span>
          <span className="active-api-badge" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
            API de Busca: {filters.searchApi}
          </span>
          <button 
            onClick={onToggleChat} 
            className={`btn ${isChatOpen ? 'primary' : ''}`} 
            style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <MessageSquare size={12} />
            {isChatOpen ? 'Fechar Assistente' : 'Assistente IA'}
          </button>
        </div>
      </div>

      {/* Caixa de Busca */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, display: 'flex', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
            {/* Seletor de Modo */}
            <select 
              className="input-field" 
              value={mode} 
              onChange={(e) => setMode(e.target.value)}
              style={{ width: '150px', border: 'none', borderRight: '1px solid var(--border-subtle)', borderRadius: 0, paddingRight: '20px', backgroundColor: 'var(--bg-tertiary)', fontWeight: 500 }}
            >
              <option value="A">Por Nome/Modelo</option>
              <option value="B">Por Função/Uso</option>
              <option value="C">Por Serial/Lote</option>
              <option value="E">Price Hunter (Preços)</option>
              <option value="F">Troubleshooting</option>
              <option value="G">Compatibilidade/Rigs</option>
              <option value="H">Lançamentos/Trends</option>
            </select>

            <input 
              type="text" 
              placeholder={
                mode === 'A' ? "Ex: Sony FX6, Canon C70, Rode NTG5..." :
                mode === 'B' ? "Ex: câmera leve para documentário noturno..." :
                mode === 'C' ? "Ex: Sony FX3 serial 4478021..." :
                mode === 'E' ? "Ex: Sony FX3 melhor preço, cupons..." :
                mode === 'F' ? "Ex: Sony FX3 overheating bug em 4K 120fps..." :
                mode === 'G' ? "Ex: cage SmallRig para Sony FX3..." :
                "Ex: lançamentos NAB 2026, novas câmeras..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field"
              style={{ border: 'none' }}
            />
          </div>

          <button type="submit" className="btn primary" disabled={loading} style={{ padding: '0 24px', fontWeight: 600 }}>
            {loading ? 'Pesquisando...' : <><Search size={16} /> Buscar</>}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '0.85rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={12} /> Sugestões:
          </span>
          {['Sony FX3', 'Canon C70', 'Sennheiser MKH416', 'tripé para externa'].map((sug) => (
            <button 
              key={sug}
              onClick={() => { setQuery(sug); handleSearch(sug); }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-hover)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Resultados da Pesquisa da Sessão */}
      {filteredResults.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Film size={18} /> Resultados da Busca ({filteredResults.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredResults.map((result) => (
              <div key={result.data.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{result.data.name}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {result.data.manufacturer} • {result.data.category}
                    </span>
                  </div>
                  <span className="active-api-badge" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>API</span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.35, flex: 1 }}>
                  {(result.data.dossier?.summary || 'Sem resumo analítico disponível.').substring(0, 140)}...
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {result.data.prices[0]?.price || 'N/A'}
                  </span>
                  <button onClick={() => onOpenEquipment(result.data)} className="btn primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    <Eye size={14} /> Abrir Dossiê
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid do Acervo Favoritos na Home */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={18} /> Equipamentos Catalogados no Acervo ({filteredFavorites.length})
        </h2>

        {filteredFavorites.length === 0 ? (
          <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <SlidersHorizontal size={24} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ fontSize: '0.9rem' }}>
              {favorites.length > 0 
                ? 'Nenhum equipamento catalogado atende aos filtros de refinamento ativos.' 
                : 'Seu acervo de equipamentos está vazio no momento.'}
            </p>
            <p style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-muted)' }}>
              {favorites.length > 0 
                ? 'Ajuste os filtros de bocal, orçamento ou marca na barra lateral.'
                : 'Use a barra de busca acima para pesquisar equipamentos e clique em favoritar para adicioná-los.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredFavorites.map((fav) => (
              <div key={fav.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{fav.name}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {fav.manufacturer} • {fav.category}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={12} className={i < fav.stars ? "fill-current text-[#cda250]" : "text-gray-700"} />
                    ))}
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.35, flex: 1 }}>
                  {(fav.dossier?.summary || 'Sem resumo analítico disponível.').substring(0, 140)}...
                </p>

                {fav.notes && (
                  <div style={{ padding: '6px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', borderLeft: '2px solid var(--accent)', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                    "{fav.notes.substring(0, 80)}..."
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {fav.prices[0]?.price || 'N/A'}
                  </span>
                  <button onClick={() => onOpenEquipment(fav)} className="btn primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    <Eye size={14} /> Dossiê
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
