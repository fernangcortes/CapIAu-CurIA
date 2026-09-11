import { useState, useRef } from 'react';
import { Sidebar, type Filters } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SuperMenu } from './components/SuperMenu';
import { ChatAssistant } from './components/ChatAssistant';
import { type EquipmentData } from './services/apiRouter';
import { type FavoriteEquipment } from './db/localDatabase';

function App() {
  const [filters, setFilters] = useState<Filters>({
    category: 'All',
    mount: 'All',
    resolution: 'All',
    manufacturer: 'All',
    maxPrice: 15000,
    usePriceFilter: false,
    sensorSize: 'All',
    logProfile: 'All',
    hasNd: false,
    lensType: 'All',
    maxAperture: 'All',
    hasStabilization: false,
    audioType: 'All',
    audioConnector: 'All',
    polarPattern: 'All',
    lightType: 'All',
    lightTemp: 'All',
    searchApi: 'serper',
    minSpecs: {}
  });

  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentData | FavoriteEquipment | null>(null);
  
  // Controle do painel do chatbot assistente
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Refs para expor a busca e controle de input do dashboard
  const triggerSearchRef = useRef<((query: string) => void) | null>(null);
  const triggerSetupSearchRef = useRef<((rigName: string, rigDescription: string, items: { query: string, category: string, reason: string, estimatedBudget: number }[]) => void) | null>(null);
  const setQueryRef = useRef<((query: string) => void) | null>(null);

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const handleOpenEquipment = (equipment: EquipmentData | FavoriteEquipment) => {
    setSelectedEquipment(equipment);
  };

  const handleCloseEquipment = () => {
    setSelectedEquipment(null);
  };

  const handleTriggerSearch = (query: string) => {
    if (triggerSearchRef.current) {
      triggerSearchRef.current(query);
    }
  };

  const handleUpdateQuery = (query: string) => {
    if (setQueryRef.current) {
      setQueryRef.current(query);
    }
  };

  const handleUpdateFiltersFromChat = (updated: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...updated }));
  };

  return (
    <div className="app-container">
      {/* Sidebar Retrátil */}
      <Sidebar 
        filters={filters}
        onSelectFavorite={(fav) => handleOpenEquipment(fav)}
        onTriggerSearch={handleTriggerSearch}
        onFilterChange={handleFilterChange}
      />

      {/* Área Central / Dashboard */}
      <Dashboard 
        filters={filters}
        onOpenEquipment={handleOpenEquipment}
        triggerSearchRef={triggerSearchRef}
        triggerSetupSearchRef={triggerSetupSearchRef}
        setQueryRef={setQueryRef}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Assistente IA Chatbot na Direita */}
      <ChatAssistant 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onUpdateFilters={handleUpdateFiltersFromChat}
        onTriggerSearch={handleTriggerSearch}
        onUpdateQuery={handleUpdateQuery}
        onTriggerSetupSearch={(rigName, rigDescription, items) => {
          if (triggerSetupSearchRef.current) {
            triggerSetupSearchRef.current(rigName, rigDescription, items);
          }
        }}
      />

      {/* Overlay do Super Menu 7-em-1 */}
      {selectedEquipment && (
        <SuperMenu 
          equipment={selectedEquipment}
          onClose={handleCloseEquipment}
        />
      )}
    </div>
  );
}

export default App;
