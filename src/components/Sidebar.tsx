import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FavoriteEquipment } from '../db/localDatabase';
import { getLocalKeys, saveLocalKeys, getProxyUrl, saveProxyUrl, getLocalModel, saveLocalModel, getServerApiStatus, type ApiKeys, type ServerApiStatus } from '../services/apiRouter';
import { 
  SlidersHorizontal, 
  History, 
  FolderHeart, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Trash2, 
  Key, 
  Link,
  Check,
  Search
} from 'lucide-react';

interface SidebarProps {
  filters: Filters;
  onSelectFavorite: (fav: FavoriteEquipment) => void;
  onTriggerSearch: (query: string) => void;
  onFilterChange: (filters: Filters) => void;
}

export interface Filters {
  category: string;
  mount: string;
  resolution: string;
  manufacturer: string;
  maxPrice: number;
  usePriceFilter: boolean;
  // Câmeras
  sensorSize: string;
  logProfile: string;
  hasNd: boolean;
  // Lentes
  lensType: string;
  maxAperture: string;
  hasStabilization: boolean;
  // Áudio
  audioType: string;
  audioConnector: string;
  polarPattern: string;
  // Iluminação
  lightType: string;
  lightTemp: string;
  searchApi: 'serper' | 'tavily' | 'exa' | 'full';
  minSpecs?: Record<string, string>;
}

export const Sidebar: React.FC<SidebarProps> = ({ filters, onSelectFavorite, onTriggerSearch, onFilterChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'history' | 'favorites' | 'profile'>('filters');

  // Perfil e chaves de API
  const [keys, setKeys] = useState<ApiKeys>({ 
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
  });
  const [proxyUrl, setProxyUrlState] = useState('');
  const [openRouterModel, setOpenRouterModel] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerApiStatus | null>(null);

  // Queries reativas usando Dexie
  const historyList = useLiveQuery(() => 
    db.searchHistory.orderBy('timestamp').reverse().limit(30).toArray()
  ) || [];

  const favoritesList = useLiveQuery(() => 
    db.favorites.orderBy('dateAdded').reverse().toArray()
  ) || [];

  // Carregar chaves salvas e buscar status do servidor
  const fetchServerStatus = () => {
    getServerApiStatus().then(status => {
      setServerStatus(status);
    }).catch(() => {
      setServerStatus(null);
    });
  };

  useEffect(() => {
    setKeys(getLocalKeys());
    setProxyUrlState(getProxyUrl());
    const model = getLocalModel();
    setOpenRouterModel(model);
    setIsCustomModel(
      model !== 'google/gemini-2.5-flash' && 
      model !== 'google/gemini-2.5-flash:free' && 
      model !== 'google/gemini-2.5-pro' && 
      model !== 'openrouter/free'
    );
    
    // Buscar status das chaves do .env no proxy local
    getServerApiStatus().then(status => {
      if (status) setServerStatus(status);
    });
  }, []);

  // Buscar status do servidor também quando mudar para a aba Perfil
  useEffect(() => {
    if (activeTab === 'profile') {
      fetchServerStatus();
    }
  }, [activeTab]);

  const handleKeyChange = (keyName: keyof ApiKeys, value: string) => {
    const updated = { ...keys, [keyName]: value };
    setKeys(updated);
    saveLocalKeys(updated);
  };

  const handleModelChange = (model: string) => {
    setOpenRouterModel(model);
    saveLocalModel(model);
  };

  const handleProxyChange = (url: string) => {
    setProxyUrlState(url);
    saveProxyUrl(url);
  };

  const handleSaveKeys = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveLocalKeys(keys);
    saveProxyUrl(proxyUrl);
    saveLocalModel(openRouterModel);
    setSaveSuccess(true);
    fetchServerStatus(); // Atualiza o status após salvar
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleClearHistory = async () => {
    await db.searchHistory.clear();
  };

  const handleDeleteFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await db.favorites.delete(id);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        size={14} 
        className={i < rating ? "fill-current text-[#cda250]" : "text-gray-600"} 
      />
    ));
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2>CapIAu-CurIA</h2>
        <button 
          className="sidebar-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Tabs */}
      <div className="sidebar-menu">
        <button 
          className={`sidebar-tab-btn ${activeTab === 'filters' ? 'active' : ''}`}
          onClick={() => { setActiveTab('filters'); setIsCollapsed(false); }}
          title="Filtros Flexíveis"
        >
          <SlidersHorizontal size={18} />
          {!isCollapsed && <span>Filtros</span>}
        </button>
        <button 
          className={`sidebar-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => { setActiveTab('history'); setIsCollapsed(false); }}
          title="Histórico Cognitivo"
        >
          <History size={18} />
          {!isCollapsed && <span>Histórico</span>}
        </button>
        <button 
          className={`sidebar-tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => { setActiveTab('favorites'); setIsCollapsed(false); }}
          title="Acervo Local"
        >
          <FolderHeart size={18} />
          {!isCollapsed && <span>Acervo</span>}
        </button>
        <button 
          className={`sidebar-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => { setActiveTab('profile'); setIsCollapsed(false); }}
          title="Perfil do Produtor"
        >
          <User size={18} />
          {!isCollapsed && <span>Perfil</span>}
        </button>
      </div>

      {/* Conteúdo da Tab Ativa */}
      {!isCollapsed && (
        <div className="sidebar-content">
          {activeTab === 'filters' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                Filtros (Opcionais)
              </h3>
              
              <div className="input-group">
                <label className="input-label">Mecanismo de Busca (API)</label>
                <select 
                  className="input-field" 
                  value={filters.searchApi} 
                  onChange={(e) => onFilterChange({ ...filters, searchApi: e.target.value as any })}
                >
                  <option value="serper">Serper.dev (Google Search)</option>
                  <option value="tavily">Tavily (RAG / Resumos Técnicos)</option>
                  <option value="exa">Exa.ai (Semântica / Conceitos)</option>
                  <option value="full">Pesquisa Completa (Consolidada)</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Categoria de Equipamento</label>
                <select 
                  className="input-field" 
                  value={filters.category} 
                  onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
                >
                  <option value="All">Qualquer Categoria (Sem Filtro)</option>
                  <option value="Câmeras">Câmeras</option>
                  <option value="Lentes">Lentes</option>
                  <option value="Áudio">Áudio e Gravadores</option>
                  <option value="Iluminação">Iluminação e Luzes</option>
                  <option value="Suporte e Rigging">Suportes, Rigs e Tripés</option>
                  <option value="Monitores e Transmissores">Monitores e Conectividade</option>
                  {/* Categoria Customizada Dinâmica sugerida pelo chatbot */}
                  {filters.category !== 'All' && 
                   filters.category !== 'Câmeras' && 
                   filters.category !== 'Lentes' && 
                   filters.category !== 'Áudio' && 
                   filters.category !== 'Iluminação' && 
                   filters.category !== 'Suporte e Rigging' && 
                   filters.category !== 'Monitores e Transmissores' && (
                     <option value={filters.category}>{filters.category}</option>
                  )}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Fabricante/Marca</label>
                <select 
                  className="input-field" 
                  value={filters.manufacturer} 
                  onChange={(e) => onFilterChange({ ...filters, manufacturer: e.target.value })}
                >
                  <option value="All">Qualquer Fabricante</option>
                  <option value="Sony">Sony</option>
                  <option value="Canon">Canon</option>
                  <option value="RED">RED Digital Cinema</option>
                  <option value="ARRI">ARRI</option>
                  <option value="Blackmagic">Blackmagic Design</option>
                  <option value="Sennheiser">Sennheiser</option>
                  <option value="Rode">Rode</option>
                  <option value="Aputure">Aputure</option>
                  <option value="Sigma">Sigma</option>
                  <option value="Zeiss">Zeiss</option>
                  <option value="SmallRig">SmallRig</option>
                  <option value="Tilta">Tilta</option>
                  {/* Fabricante customizado dinâmico sugerido pelo chatbot */}
                  {filters.manufacturer !== 'All' && 
                   filters.manufacturer !== 'Sony' && 
                   filters.manufacturer !== 'Canon' && 
                   filters.manufacturer !== 'RED' && 
                   filters.manufacturer !== 'ARRI' && 
                   filters.manufacturer !== 'Blackmagic' && 
                   filters.manufacturer !== 'Sennheiser' && 
                   filters.manufacturer !== 'Rode' && 
                   filters.manufacturer !== 'Aputure' && 
                   filters.manufacturer !== 'Sigma' && 
                   filters.manufacturer !== 'Zeiss' && 
                   filters.manufacturer !== 'SmallRig' && 
                   filters.manufacturer !== 'Tilta' && (
                     <option value={filters.manufacturer}>{filters.manufacturer}</option>
                  )}
                </select>
              </div>

              {/* Especificações Mínimas Dinâmicas (Sugeridas/Editáveis) */}
              {filters.minSpecs && Object.keys(filters.minSpecs).length > 0 && (
                <div className="card" style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', margin: '0 0 12px 0', border: '1px solid var(--border-subtle)' }}>
                  <label className="input-label" style={{ marginBottom: '8px', display: 'block', fontWeight: 600, color: 'var(--text-primary)' }}>Specs Mínimos Exigidos</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(filters.minSpecs).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }} title={key}>{key}:</span>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            className="input-field" 
                            value={val} 
                            onChange={(e) => {
                              const updated = { ...filters.minSpecs, [key]: e.target.value };
                              onFilterChange({ ...filters, minSpecs: updated });
                            }}
                            style={{ width: '90px', padding: '2px 6px', fontSize: '0.75rem', height: '22px' }}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const updated = { ...filters.minSpecs };
                              delete updated[key];
                              onFilterChange({ ...filters, minSpecs: updated });
                            }}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.9rem', padding: '0 4px', fontWeight: 'bold' }}
                            title="Remover Requisito"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro de Preço Opcional */}
              <div className="card" style={{ padding: '10px', backgroundColor: 'var(--bg-primary)', margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="price-toggle"
                    checked={filters.usePriceFilter} 
                    onChange={(e) => onFilterChange({ ...filters, usePriceFilter: e.target.checked })}
                    style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <label htmlFor="price-toggle" className="input-label" style={{ cursor: 'pointer', margin: 0 }}>
                    Filtrar por Orçamento
                  </label>
                </div>

                {filters.usePriceFilter && (
                  <div className="input-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Máximo:</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        ${filters.maxPrice.toLocaleString()}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="100" 
                      max="30000" 
                      step="100"
                      value={filters.maxPrice}
                      onChange={(e) => onFilterChange({ ...filters, maxPrice: Number(e.target.value) })}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: '100%' }}
                    />
                  </div>
                )}
              </div>

              {/* Filtros Adaptativos baseados na categoria selecionada */}
              {filters.category === 'Câmeras' && (
                <div className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0, borderLeft: '3px solid var(--accent)' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Filtros de Câmeras</h4>
                  
                  <div className="input-group">
                    <label className="input-label">Bocal da Lente (Mount)</label>
                    <select className="input-field" value={filters.mount} onChange={(e) => onFilterChange({ ...filters, mount: e.target.value })}>
                      <option value="All">Qualquer Bocal</option>
                      <option value="E-mount">Sony E-mount</option>
                      <option value="RF-mount">Canon RF-mount</option>
                      <option value="PL-mount">Arri PL-mount</option>
                      <option value="EF-mount">Canon EF-mount</option>
                      <option value="L-mount">Leica L-mount</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Resolução de Gravação</label>
                    <select className="input-field" value={filters.resolution} onChange={(e) => onFilterChange({ ...filters, resolution: e.target.value })}>
                      <option value="All">Qualquer Resolução</option>
                      <option value="8K">8K Cinema</option>
                      <option value="6K">6K Ultra</option>
                      <option value="4K">4K UHD</option>
                      <option value="1080p">Full HD (1080p)</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Tamanho do Sensor</label>
                    <select className="input-field" value={filters.sensorSize} onChange={(e) => onFilterChange({ ...filters, sensorSize: e.target.value })}>
                      <option value="All">Qualquer Sensor</option>
                      <option value="Full-Frame">Full-Frame</option>
                      <option value="APS-C">APS-C / Super35</option>
                      <option value="Micro Four Thirds">Micro Four Thirds (MFT)</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Perfil Logarítmico</label>
                    <select className="input-field" value={filters.logProfile} onChange={(e) => onFilterChange({ ...filters, logProfile: e.target.value })}>
                      <option value="All">Qualquer Perfil</option>
                      <option value="S-Log3">Sony S-Log3</option>
                      <option value="C-Log">Canon C-Log</option>
                      <option value="RAW">Internal RAW</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                    <input 
                      type="checkbox" 
                      id="nd-toggle"
                      checked={filters.hasNd} 
                      onChange={(e) => onFilterChange({ ...filters, hasNd: e.target.checked })}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <label htmlFor="nd-toggle" className="input-label" style={{ cursor: 'pointer', margin: 0 }}>
                      Filtro ND Variável Embutido
                    </label>
                  </div>
                </div>
              )}

              {filters.category === 'Lentes' && (
                <div className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0, borderLeft: '3px solid var(--accent)' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Filtros de Lentes</h4>
                  
                  <div className="input-group">
                    <label className="input-label">Bocal de Encaixe (Mount)</label>
                    <select className="input-field" value={filters.mount} onChange={(e) => onFilterChange({ ...filters, mount: e.target.value })}>
                      <option value="All">Qualquer Bocal</option>
                      <option value="E-mount">Sony E-mount</option>
                      <option value="RF-mount">Canon RF-mount</option>
                      <option value="PL-mount">PL-mount Cinema</option>
                      <option value="EF-mount">Canon EF-mount</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Tipo de Lente</label>
                    <select className="input-field" value={filters.lensType} onChange={(e) => onFilterChange({ ...filters, lensType: e.target.value })}>
                      <option value="All">Qualquer Tipo</option>
                      <option value="Prime">Focal Fixa (Prime)</option>
                      <option value="Zoom">Zoom Dinâmico</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Abertura Máxima</label>
                    <select className="input-field" value={filters.maxAperture} onChange={(e) => onFilterChange({ ...filters, maxAperture: e.target.value })}>
                      <option value="All">Qualquer Abertura</option>
                      <option value="f/1.2">f/1.2 ou maior</option>
                      <option value="f/1.8">f/1.8 ou maior</option>
                      <option value="f/2.8">f/2.8 ou maior</option>
                      <option value="f/4">f/4 ou maior</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                    <input 
                      type="checkbox" 
                      id="stab-toggle"
                      checked={filters.hasStabilization} 
                      onChange={(e) => onFilterChange({ ...filters, hasStabilization: e.target.checked })}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <label htmlFor="stab-toggle" className="input-label" style={{ cursor: 'pointer', margin: 0 }}>
                      Estabilização Óptica
                    </label>
                  </div>
                </div>
              )}

              {filters.category === 'Áudio' && (
                <div className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0, borderLeft: '3px solid var(--accent)' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Filtros de Áudio</h4>
                  
                  <div className="input-group">
                    <label className="input-label">Tipo de Captação</label>
                    <select className="input-field" value={filters.audioType} onChange={(e) => onFilterChange({ ...filters, audioType: e.target.value })}>
                      <option value="All">Qualquer Tipo</option>
                      <option value="Shotgun">Microfone Direcional (Shotgun)</option>
                      <option value="Lavalier">Microfone de Lapela</option>
                      <option value="Gravador">Gravador Digital Externo</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Conexão Física</label>
                    <select className="input-field" value={filters.audioConnector} onChange={(e) => onFilterChange({ ...filters, audioConnector: e.target.value })}>
                      <option value="All">Qualquer Conexão</option>
                      <option value="XLR">XLR Balanceado</option>
                      <option value="3.5mm">P2/P10 (3.5mm/6.3mm)</option>
                      <option value="USB">Digital USB-C</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Padrão Polar</label>
                    <select className="input-field" value={filters.polarPattern} onChange={(e) => onFilterChange({ ...filters, polarPattern: e.target.value })}>
                      <option value="All">Qualquer Padrão</option>
                      <option value="Supercardióide">Supercardióide / Lobar</option>
                      <option value="Cardioide">Cardioide Standard</option>
                      <option value="Omnidirecional">Omnidirecional</option>
                    </select>
                  </div>
                </div>
              )}

              {filters.category === 'Iluminação' && (
                <div className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0, borderLeft: '3px solid var(--accent)' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Filtros de Iluminação</h4>
                  
                  <div className="input-group">
                    <label className="input-label">Fator de Forma</label>
                    <select className="input-field" value={filters.lightType} onChange={(e) => onFilterChange({ ...filters, lightType: e.target.value })}>
                      <option value="All">Qualquer Iluminador</option>
                      <option value="COB LED">Luz Concentrada (COB LED / Spotlight)</option>
                      <option value="Painel LED">Painel de Difusão LED</option>
                      <option value="Bastão RGB">Bastão de LED / Tubo RGB</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Temperatura de Cor</label>
                    <select className="input-field" value={filters.lightTemp} onChange={(e) => onFilterChange({ ...filters, lightTemp: e.target.value })}>
                      <option value="All">Qualquer Temperatura</option>
                      <option value="Daylight">Daylight Estável (5600K)</option>
                      <option value="Bi-color">Bi-color Variável (2700K-6500K)</option>
                      <option value="RGB">RGB Completo (Colorido/HSI)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Buscas Recentes</h3>
                {historyList.length > 0 && (
                  <button 
                    onClick={handleClearHistory} 
                    style={{ background: 'none', border: 'none', color: 'var(--error-color)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Limpar
                  </button>
                )}
              </div>

              {historyList.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
                  Nenhuma pesquisa registrada.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {historyList.map((entry) => (
                    <div 
                      key={entry.id} 
                      className="card" 
                      style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', margin: 0 }}
                      onClick={() => onTriggerSearch(entry.query)}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {entry.query}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Modo: {entry.mode === 'A' ? 'Modelo' : entry.mode === 'B' ? 'Função' : entry.mode === 'C' ? 'Serial' : 'Troubleshoot'} • {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <Search size={14} className="text-gray-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Acervo de Equipamentos</h3>
              
              {favoritesList.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
                  Sem favoritos salvos localmente. Marque com estrelas um equipamento para catalogá-lo aqui.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {favoritesList.map((fav) => (
                    <div 
                      key={fav.id}
                      className="card"
                      style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', margin: 0 }}
                      onClick={() => onSelectFavorite(fav)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ overflow: 'hidden' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {fav.name}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {fav.category}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => handleDeleteFavorite(e, fav.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                          title="Remover do Acervo"
                        >
                          <Trash2 size={14} className="hover:text-red-400" />
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {renderStars(fav.stars)}
                        </div>
                        {fav.prices && fav.prices.length > 0 && (
                          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {fav.prices[0].price}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <Key size={16} /> Configurações de API
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} /> Auto-salvo
                </span>
              </div>

              <button 
                type="button" 
                onClick={() => handleSaveKeys()}
                className={`btn ${saveSuccess ? 'success' : 'primary'}`} 
                style={{ width: '100%', justifyContent: 'center', padding: '7px 12px', fontSize: '0.8rem' }}
              >
                {saveSuccess ? (
                  <>
                    <Check size={14} /> Salvo com Sucesso!
                  </>
                ) : 'Salvar Configurações Agora'}
              </button>
              
              <form onSubmit={handleSaveKeys} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Indicador de provedor ativo */}
                {(() => {
                  const hasGoogleAi = !!keys.googleAi || !!serverStatus?.googleAi;
                  const hasOpenRouter = !!keys.openRouter || !!serverStatus?.openRouter;
                  const isActiveGoogleAI = hasGoogleAi && openRouterModel.startsWith('google/gemini');
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ padding: '8px 12px', borderRadius: '4px', backgroundColor: isActiveGoogleAI ? 'rgba(52, 168, 83, 0.1)' : hasOpenRouter ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${isActiveGoogleAI ? 'rgba(52, 168, 83, 0.3)' : hasOpenRouter ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '1rem' }}>{isActiveGoogleAI ? '🚀' : hasOpenRouter ? '🔄' : '❌'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {isActiveGoogleAI
                            ? `Rota ativa: Google AI Studio (${keys.googleAi ? 'direto' : 'Servidor .env'}, ~3-8s)`
                            : hasOpenRouter
                              ? `Rota ativa: OpenRouter (${keys.openRouter ? 'direto' : 'Servidor .env'}, ~15-40s)`
                              : 'Nenhuma chave de LLM configurada'
                          }
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 4px' }}>
                        <span>Busca Web:</span>
                        {(keys.serper || serverStatus?.serper) ? (
                          <span style={{ color: '#4ade80', fontWeight: 500 }}>● Serper.dev (Google Shopping ativo)</span>
                        ) : (keys.tavily || serverStatus?.tavily) ? (
                          <span style={{ color: '#4ade80', fontWeight: 500 }}>● Tavily (RAG ativo)</span>
                        ) : (keys.exa || serverStatus?.exa) ? (
                          <span style={{ color: '#4ade80', fontWeight: 500 }}>● Exa.ai (Semântica ativa)</span>
                        ) : (
                          <span style={{ color: '#fbbf24', fontWeight: 500 }}>⚡ Síntese Direta por IA (Sem chave de busca)</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="input-group">
                  <label className="input-label">⭐ Google AI Studio Key (Recomendado — Rápido e Grátis)</label>
                  <input 
                    type="password" 
                    placeholder={serverStatus?.googleAi ? "Definida no arquivo .env do Servidor" : "AIzaSy..."} 
                    className="input-field"
                    style={{ borderColor: (keys.googleAi || serverStatus?.googleAi) ? 'rgba(52, 168, 83, 0.4)' : undefined }}
                    value={keys.googleAi}
                    onChange={(e) => handleKeyChange('googleAi', e.target.value)}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Gere grátis em aistudio.google.com → Get API Key</span>
                </div>

                 <div className="input-group">
                  <label className="input-label">OpenRouter API Key (Fallback / Modelos não-Gemini)</label>
                  <input 
                    type="password" 
                    placeholder={serverStatus?.openRouter ? "Definida no arquivo .env do Servidor" : "sk-or-..."} 
                    className="input-field"
                    style={{ borderColor: (keys.openRouter || serverStatus?.openRouter) ? 'rgba(52, 168, 83, 0.4)' : undefined }}
                    value={keys.openRouter}
                    onChange={(e) => handleKeyChange('openRouter', e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Modelo do OpenRouter</label>
                  <select 
                    className="input-field" 
                    value={isCustomModel ? 'custom' : openRouterModel}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setIsCustomModel(true);
                        handleModelChange('');
                      } else {
                        setIsCustomModel(false);
                        handleModelChange(val);
                      }
                    }}
                  >
                    <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (Recomendado ⚡)</option>
                    <option value="google/gemini-2.5-flash:free">Gemini 2.5 Flash (Grátis ⚡)</option>
                    <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (Mais inteligente, mais lento)</option>
                    <option value="openrouter/free">Auto Router (OpenRouter Grátis, Lento)</option>
                    <option value="custom">Outro Modelo (Digitar)...</option>
                  </select>
                </div>

                {isCustomModel && (
                  <div className="input-group">
                    <label className="input-label">Identificador do Modelo</label>
                    <input 
                      type="text" 
                      placeholder="Ex: meta-llama/llama-3.3-70b-instruct" 
                      className="input-field"
                      value={openRouterModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                    />
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label">Serper.dev API Key (Google Search)</label>
                  <input 
                    type="password" 
                    placeholder={serverStatus?.serper ? "Definida no arquivo .env do Servidor" : "Sua chave Serper"} 
                    className="input-field"
                    style={{ borderColor: (keys.serper || serverStatus?.serper) ? 'rgba(52, 168, 83, 0.4)' : undefined }}
                    value={keys.serper}
                    onChange={(e) => handleKeyChange('serper', e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Tavily API Key (Extração RAG)</label>
                  <input 
                    type="password" 
                    placeholder={serverStatus?.tavily ? "Definida no arquivo .env do Servidor" : "tvly-..."} 
                    className="input-field"
                    style={{ borderColor: (keys.tavily || serverStatus?.tavily) ? 'rgba(52, 168, 83, 0.4)' : undefined }}
                    value={keys.tavily}
                    onChange={(e) => handleKeyChange('tavily', e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Exa API Key (Busca Semântica)</label>
                  <input 
                    type="password" 
                    placeholder={serverStatus?.exa ? "Definida no arquivo .env do Servidor" : "Chave Exa"} 
                    className="input-field"
                    style={{ borderColor: (keys.exa || serverStatus?.exa) ? 'rgba(52, 168, 83, 0.4)' : undefined }}
                    value={keys.exa}
                    onChange={(e) => handleKeyChange('exa', e.target.value)}
                  />
                </div>

                <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px' }}>
                  <label className="input-label" style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>APIs de Scraping & Fóruns (Opcionais)</label>
                  
                  <div className="input-group">
                    <label className="input-label">Diffbot Token (Extração Estruturada)</label>
                    <input 
                      type="password" 
                      placeholder={serverStatus?.diffbot ? "Definida no arquivo .env do Servidor" : "Diffbot token"} 
                      className="input-field"
                      style={{ borderColor: (keys.diffbot || serverStatus?.diffbot) ? 'rgba(52, 168, 83, 0.4)' : undefined }}
                      value={keys.diffbot}
                      onChange={(e) => handleKeyChange('diffbot', e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Firecrawl API Key (Markdown p/ LLM)</label>
                    <input 
                      type="password" 
                      placeholder={serverStatus?.firecrawl ? "Definida no arquivo .env do Servidor" : "fc-..."} 
                      className="input-field"
                      style={{ borderColor: (keys.firecrawl || serverStatus?.firecrawl) ? 'rgba(52, 168, 83, 0.4)' : undefined }}
                      value={keys.firecrawl}
                      onChange={(e) => handleKeyChange('firecrawl', e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Scrape.do Token (Proxy Rotativo)</label>
                    <input 
                      type="password" 
                      placeholder={serverStatus?.scrapeDo ? "Definida no arquivo .env do Servidor" : "Scrape.do token"} 
                      className="input-field"
                      style={{ borderColor: (keys.scrapeDo || serverStatus?.scrapeDo) ? 'rgba(52, 168, 83, 0.4)' : undefined }}
                      value={keys.scrapeDo}
                      onChange={(e) => handleKeyChange('scrapeDo', e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="input-group">
                      <label className="input-label">Reddit Client ID</label>
                      <input 
                        type="password" 
                        placeholder={serverStatus?.redditClientId ? "Definida no .env" : "Client ID"} 
                        className="input-field"
                        style={{ borderColor: (keys.redditClientId || serverStatus?.redditClientId) ? 'rgba(52, 168, 83, 0.4)' : undefined }}
                        value={keys.redditClientId}
                        onChange={(e) => handleKeyChange('redditClientId', e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Reddit Secret</label>
                      <input 
                        type="password" 
                        placeholder={serverStatus?.redditClientSecret ? "Definida no .env" : "Secret"} 
                        className="input-field"
                        style={{ borderColor: (keys.redditClientSecret || serverStatus?.redditClientSecret) ? 'rgba(52, 168, 83, 0.4)' : undefined }}
                        value={keys.redditClientSecret}
                        onChange={(e) => handleKeyChange('redditClientSecret', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '4px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Link size={16} /> Proxy Backend (Opcional)
                  </h3>
                  <div className="input-group">
                    <label className="input-label">URL do Servidor Proxy</label>
                    <input 
                      type="text" 
                      placeholder="/api (Vercel) ou URL customizada" 
                      className="input-field"
                      value={proxyUrl}
                      onChange={(e) => handleProxyChange(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className={`btn primary ${saveSuccess ? 'success' : ''}`} 
                  style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
                >
                  {saveSuccess ? (
                    <>
                      <Check size={16} /> Salvo com Sucesso!
                    </>
                  ) : 'Salvar Configurações'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
