import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FavoriteEquipment } from '../db/localDatabase';
import { 
  X, 
  Star, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  FileText, 
  DollarSign, 
  Sparkles, 
  Layers, 
  BookOpen, 
  Edit3, 
  AlertTriangle, 
  TrendingUp,
  RotateCcw,
  Check,
  Save
} from 'lucide-react';

import type { EquipmentData } from '../services/apiRouter';

interface SuperMenuProps {
  equipment: EquipmentData | FavoriteEquipment;
  onClose: () => void;
}

interface ModuleConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  visible: boolean;
}

function sanitizeUrl(url: string | undefined): string {
  if (!url) return '#';
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  return '#';
}

const DEFAULT_MODULES = [
  { id: 'specs', title: 'Ficha Técnica', icon: <FileText size={16} />, visible: true },
  { id: 'prices', title: 'Preços e Lojas', icon: <DollarSign size={16} />, visible: true },
  { id: 'financials', title: 'Ciclo de Vida e Financeiro', icon: <TrendingUp size={16} />, visible: true },
  { id: 'dossier', title: 'Dossiê de IA', icon: <Sparkles size={16} />, visible: true },
  { id: 'similars', title: 'Gears Similares', icon: <Layers size={16} />, visible: true },
  { id: 'manuals', title: 'Manuais e Vídeos', icon: <BookOpen size={16} />, visible: true },
  { id: 'notes', title: 'Notas de Campo', icon: <Edit3 size={16} />, visible: true },
  { id: 'maintenance', title: 'Manutenção e BugTracker', icon: <AlertTriangle size={16} />, visible: true },
];

export const SuperMenu: React.FC<SuperMenuProps> = ({ equipment, onClose }) => {
  const [modules, setModules] = useState<ModuleConfig[]>([]);
  const [rating, setRating] = useState<number>(0);
  const [localNote, setLocalNote] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isNoteSaving, setIsNoteSaving] = useState<boolean>(false);

  // Carregar dados de favoritos se o item já estiver cadastrado no acervo
  const dbFavorite = useLiveQuery(() => db.favorites.get(equipment?.id || ''), [equipment?.id]);
  const dbNote = useLiveQuery(() => db.notes.get(equipment?.id || ''), [equipment?.id]);

  // Carregar configuração de ordem e visibilidade dos módulos
  useEffect(() => {
    const savedOrder = localStorage.getItem('capiau_supermenu_modules');
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder) as { id: string; visible: boolean }[];
        // Reconstrói a lista mantendo a ordem salva
        const ordered = parsed.map(p => {
          const original = DEFAULT_MODULES.find(m => m.id === p.id);
          if (original) {
            return { ...original, visible: p.visible };
          }
          return null;
        }).filter(Boolean) as ModuleConfig[];

        // Adiciona módulos novos que não estavam na ordem salva (caso existam)
        DEFAULT_MODULES.forEach(m => {
          if (!ordered.some(o => o.id === m.id)) {
            ordered.push(m);
          }
        });
        setModules(ordered);
      } catch (e) {
        setModules(DEFAULT_MODULES);
      }
    } else {
      setModules(DEFAULT_MODULES);
    }
  }, []);

  // Sincronizar o estado dos favoritos e notas locais
  useEffect(() => {
    if (dbFavorite) {
      setRating(dbFavorite.stars);
      setIsSaved(true);
    } else {
      setRating(0);
      setIsSaved(false);
    }
  }, [dbFavorite]);

  useEffect(() => {
    if (dbNote) {
      setLocalNote(dbNote.content);
    } else {
      setLocalNote('');
    }
  }, [dbNote]);

  // Salvar configuração dos módulos no localStorage
  const saveModuleConfig = (newModules: ModuleConfig[]) => {
    setModules(newModules);
    localStorage.setItem(
      'capiau_supermenu_modules', 
      JSON.stringify(newModules.map(m => ({ id: m.id, visible: m.visible })))
    );
  };

  // Funções de Reordenação
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newModules = [...modules];
    const temp = newModules[index];
    newModules[index] = newModules[index - 1];
    newModules[index - 1] = temp;
    saveModuleConfig(newModules);
  };

  const moveDown = (index: number) => {
    if (index === modules.length - 1) return;
    const newModules = [...modules];
    const temp = newModules[index];
    newModules[index] = newModules[index + 1];
    newModules[index + 1] = temp;
    saveModuleConfig(newModules);
  };

  const toggleVisibility = (id: string) => {
    const newModules = modules.map(m => 
      m.id === id ? { ...m, visible: !m.visible } : m
    );
    saveModuleConfig(newModules);
  };

  const resetModules = () => {
    saveModuleConfig(DEFAULT_MODULES);
  };

  // Salvar ou Atualizar favorito
  const handleRatingChange = async (newStars: number) => {
    setRating(newStars);
    
    if (newStars === 0) {
      // Remover de favoritos
      await db.favorites.delete(equipment.id);
      setIsSaved(false);
      return;
    }

    const favoriteData: FavoriteEquipment = {
      ...equipment,
      stars: newStars,
      dateAdded: Date.now(),
      notes: localNote,
    };

    await db.favorites.put(favoriteData);
    setIsSaved(true);
  };

  // Salvar notas
  const handleSaveNote = async () => {
    setIsNoteSaving(true);
    await db.notes.put({
      equipmentId: equipment.id,
      content: localNote,
      lastUpdated: Date.now()
    });
    
    // Se já for favorito, atualiza as notas lá também
    if (isSaved) {
      const fav = await db.favorites.get(equipment.id);
      if (fav) {
        fav.notes = localNote;
        await db.favorites.put(fav);
      }
    }
    setTimeout(() => setIsNoteSaving(false), 800);
  };

  return (
    <div className="supermenu-overlay">
      <div className="supermenu-container">
        {/* Header */}
        <div className="supermenu-header">
          <div className="supermenu-title-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1>{equipment.name}</h1>
                <span className="active-api-badge" title="Dados consolidados via busca inteligente e processados por IA.">
                  Conectado à Nuvem
                </span>
            </div>
            <div className="supermenu-subtitle">
              <span>{equipment.manufacturer}</span>
              <span>•</span>
              <span>{equipment.category}</span>
              <span>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Avaliação:</span>
                <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star}
                      size={16}
                      className={`cursor-pointer transition-all ${
                        star <= rating ? "fill-current text-[#cda250]" : "text-gray-600 hover:text-[#cda250]"
                      }`}
                      onClick={() => handleRatingChange(star === rating ? 0 : star)}
                    />
                  ))}
                </div>
                {isSaved && <span style={{ fontSize: '0.75rem', color: 'var(--success-color)', marginLeft: '6px', fontWeight: 600 }}>[No Acervo Local]</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="sidebar-toggle-btn" style={{ padding: '10px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Corpo principal */}
        <div className="supermenu-body">
          {/* Sidebar do SuperMenu - Layout Customizador */}
          <div className="supermenu-sidebar">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Configuração Modular
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {modules.map((m) => (
                <div 
                  key={m.id} 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                    {m.icon}
                    <span style={{ color: m.visible ? 'var(--text-primary)' : 'var(--text-muted)' }}>{m.title}</span>
                  </div>
                  <button 
                    onClick={() => toggleVisibility(m.id)}
                    style={{ background: 'none', border: 'none', color: m.visible ? 'var(--text-secondary)' : 'var(--text-muted)', cursor: 'pointer' }}
                    title={m.visible ? "Ocultar Seção" : "Exibir Seção"}
                  >
                    {m.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              ))}
            </div>

            <button className="btn" onClick={resetModules} style={{ marginTop: 'auto', fontSize: '0.8rem', justifyContent: 'center' }}>
              <RotateCcw size={14} /> Restaurar Padrão
            </button>
          </div>

          {/* Conteúdo Dinâmico Reordenável */}
          <div className="supermenu-content">
            {modules
              .filter(m => m.visible)
              .map((m, idx) => {
                // Renderização de cada bloco de informação
                return (
                  <div key={m.id} className="module-item">
                    {/* Controles de ordem */}
                    <div className="module-handle">
                      <button 
                        onClick={() => moveUp(idx)} 
                        disabled={idx === 0}
                        className="module-order-btn"
                        title="Subir Bloco"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button 
                        onClick={() => moveDown(idx)} 
                        disabled={idx === modules.filter(mod => mod.visible).length - 1}
                        className="module-order-btn"
                        title="Descer Bloco"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button 
                        onClick={() => toggleVisibility(m.id)}
                        className="module-order-btn"
                        title="Ocultar Seção"
                      >
                        <EyeOff size={14} />
                      </button>
                    </div>

                    <div className="module-title">
                      {m.icon}
                      {m.title}
                    </div>

                    {/* Bloco 1: Ficha Técnica */}
                    {m.id === 'specs' && (
                      <div className="specs-grid">
                        {Object.entries(equipment.specs || {}).map(([key, val]) => (
                          <div key={key} className="spec-row">
                            <span className="spec-name">{key}</span>
                            <span className="spec-value">{val}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bloco 2: Preços e Lojas */}
                    {m.id === 'prices' && (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="price-table">
                          <thead>
                            <tr>
                              <th>Loja</th>
                              <th>Preço</th>
                              <th>Frete/Envio</th>
                              <th>Garantia</th>
                              <th>Preço Total</th>
                              <th>Condição</th>
                              <th>Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(equipment.prices || []).map((p, i) => {
                              const isHighlighted = p.isBestDeal || p.isLowRisk;
                              return (
                                <tr key={i} style={isHighlighted ? { borderLeft: p.isBestDeal ? '3px solid #4ade80' : '3px solid var(--accent)', backgroundColor: 'rgba(255, 255, 255, 0.01)' } : {}}>
                                  <td style={{ fontWeight: 600 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span>{p.store}</span>
                                      <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                                        {p.isBestDeal && (
                                          <span style={{ fontSize: '0.6rem', color: '#4ade80', border: '1px solid #4ade80', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>
                                            Melhor Custo-Benefício
                                          </span>
                                        )}
                                        {p.isLowRisk && (
                                          <span style={{ fontSize: '0.6rem', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>
                                            Menor Risco
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ color: 'var(--text-secondary)' }}>{p.price}</td>
                                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{p.shipping}</td>
                                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{p.warranty || 'Consulte o link'}</td>
                                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.totalPrice || p.price}</td>
                                  <td>
                                    <span className={`condition-badge ${(p.condition || 'Novo').toLowerCase()}`}>
                                      {p.condition || 'Novo'}
                                    </span>
                                  </td>
                                  <td>
                                    <a href={sanitizeUrl(p.link)} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                                      Ir para Loja
                                    </a>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Bloco: Ciclo de Vida e Financeiro */}
                    {m.id === 'financials' && (
                      <div className="financials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        {equipment.financials ? (
                          <>
                            <div className="card" style={{ padding: '16px', margin: 0, borderLeft: '3px solid var(--accent)' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Break-Even de Compra</span>
                              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>{equipment.financials.breakEvenDays} Diárias</h4>
                              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Quantidade de dias de aluguel necessários para justificar a compra do equipamento.
                              </p>
                            </div>
                            <div className="card" style={{ padding: '16px', margin: 0, borderLeft: '3px solid var(--accent)' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Depreciação (1 Ano)</span>
                              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>{equipment.financials.residualValue1Yr}</h4>
                              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Valor residual estimado após 1 ano de uso profissional continuado.
                              </p>
                            </div>
                            <div className="card" style={{ padding: '16px', margin: 0, borderLeft: '3px solid var(--accent)' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Depreciação (3 Anos)</span>
                              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>{equipment.financials.residualValue3Yr}</h4>
                              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Valor de liquidação projetado após 3 anos de ciclo de vida útil.
                              </p>
                            </div>
                            <div className="card" style={{ padding: '16px', margin: 0, borderLeft: '3px solid var(--accent)' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Custo Diário Operacional</span>
                              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>{equipment.financials.estimatedDailyCost}</h4>
                              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Custo de amortização da compra diluído por dia de diária média.
                              </p>
                            </div>
                          </>
                        ) : (
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
                            Análise financeira indisponível para este item (necessário buscar com chaves de API/Nuvem).
                          </p>
                        )}
                      </div>
                    )}

                    {/* Bloco 3: Dossiê de IA */}
                    {m.id === 'dossier' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '70px', height: '70px', borderRadius: '50%', border: '3px solid var(--accent)', flexShrink: 0 }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {(equipment.dossier?.recommendationScore ?? 7.0).toFixed(1)}
                            </span>
                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Score</span>
                          </div>
                          <div>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>Dossiê Analítico CapIAu-CurIA</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              {equipment.dossier?.summary || 'Sem resumo analítico disponível.'}
                            </p>
                          </div>
                        </div>

                        <div className="pros-cons-grid">
                          <div className="pros-column">
                            <div className="pros-cons-title" style={{ color: '#4ade80' }}>Vantagens e Prós</div>
                            <ul className="pros-cons-list">
                              {(equipment.dossier?.pros || []).map((p, i) => <li key={i}>{p}</li>)}
                            </ul>
                          </div>
                          <div className="cons-column">
                            <div className="pros-cons-title" style={{ color: '#f87171' }}>Limitações e Contras</div>
                            <ul className="pros-cons-list">
                              {(equipment.dossier?.cons || []).map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                          </div>
                        </div>

                        {equipment.dossier?.bestFor && equipment.dossier.bestFor.length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
                            <div>
                              <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Excelente para:</h5>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(equipment.dossier?.bestFor || []).map((b, i) => (
                                  <span key={i} style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '3px', border: '1px solid var(--border-subtle)' }}>
                                    {b}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Evitar para:</h5>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(equipment.dossier?.avoidFor || []).map((a, i) => (
                                  <span key={i} style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '3px', border: '1px solid rgba(146, 64, 64, 0.2)' }}>
                                    {a}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bloco 4: Gears Similares & Comparativo */}
                    {m.id === 'similars' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {equipment.comparisons && equipment.comparisons.length > 0 ? (
                          <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                              Matriz de Especificações Comparativas lado a lado:
                            </p>
                            <table className="price-table" style={{ width: '100%' }}>
                              <thead>
                                <tr>
                                  <th>Característica</th>
                                  <th style={{ color: 'var(--accent)', fontWeight: 700 }}>{equipment.name} (Atual)</th>
                                  <th>{(equipment.similars || [])[0]?.manufacturer} {(equipment.similars || [])[0]?.name || 'Modelo Alternativo A'}</th>
                                  <th>{(equipment.similars || [])[1]?.manufacturer} {(equipment.similars || [])[1]?.name || 'Modelo Alternativo B'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(equipment.comparisons || []).map((c, i) => (
                                  <tr key={i}>
                                    <td style={{ fontWeight: 600 }}>{c.field}</td>
                                    <td style={{ backgroundColor: 'rgba(205, 162, 80, 0.04)', color: 'var(--text-primary)', fontWeight: 600 }}>{c.current}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{c.competitor1}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{c.competitor2}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              Alternativas sugeridas no ecossistema com base no custo-benefício e finalidade técnica:
                            </p>
                            {(equipment.similars || []).map((s, i) => (
                              <div key={i} style={{ padding: '12px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{s.manufacturer} {s.name}</h4>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    {s.difference}
                                  </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '3px', border: '1px solid var(--border-subtle)', fontWeight: 500 }}>
                                    Proporção Custo: {s.priceRatio}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bloco 5: Manuais e Tutoriais */}
                    {m.id === 'manuals' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(equipment.manuals || []).map((man, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', backgroundColor: man.type === 'PDF' ? 'rgba(146,64,64,0.15)' : man.type === 'Vídeo' ? 'rgba(178,94,34,0.15)' : 'rgba(74,87,104,0.15)', color: man.type === 'PDF' ? '#ef4444' : man.type === 'Vídeo' ? '#f97316' : '#9ca3af' }}>
                                {man.type}
                              </span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{man.title}</span>
                            </div>
                            <a href={sanitizeUrl(man.url)} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                              Acessar Link
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bloco 6: Rigs e Notas de Campo */}
                    {m.id === 'notes' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="input-group" style={{ margin: 0 }}>
                          <label className="input-label">Suas Notas de Campo (Persistência Local Offline)</label>
                          <textarea 
                            value={localNote}
                            onChange={(e) => setLocalNote(e.target.value)}
                            placeholder="Adicione observações de uso, problemas em set, compatibilidades físicas..."
                            className="input-field"
                            rows={4}
                            style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.4 }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                          <button 
                            className="btn primary" 
                            onClick={handleSaveNote}
                            disabled={isNoteSaving}
                            style={{ minWidth: '110px', justifyContent: 'center' }}
                          >
                            {isNoteSaving ? (
                              <>
                                <Check size={14} /> Salvando...
                              </>
                            ) : (
                              <>
                                <Save size={14} /> Salvar Notas
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bloco 7: Diagnóstico de Firmware e Manutenção */}
                    {m.id === 'maintenance' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-primary)', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Firmware Recomendado</span>
                            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{equipment.maintenance?.currentFirmware || 'N/A'}</h4>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Data de Lançamento</span>
                            <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{equipment.maintenance?.releaseDate || 'N/A'}</p>
                          </div>
                        </div>

                        {(equipment.maintenance?.recentIssues || []).length > 0 && (
                          <div>
                            <h5 style={{ fontSize: '0.8rem', color: 'var(--warning-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', textTransform: 'uppercase' }}>
                              <AlertTriangle size={14} /> Avisos e Bugs Conhecidos do Lote
                            </h5>
                            <ul style={{ listStyle: 'inside', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '4px' }}>
                              {(equipment.maintenance?.recentIssues || []).map((iss, i) => (
                                <li key={i} style={{ lineHeight: 1.4 }}>{iss}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(equipment.maintenance?.troubleshoot || []).length > 0 && (
                          <div>
                            <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Soluções Rápidas (Troubleshooting)</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {(equipment.maintenance?.troubleshoot || []).map((t, i) => (
                                <div key={i} style={{ padding: '10px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>P: {t.problem}</p>
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.35 }}>R: {t.solution}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
