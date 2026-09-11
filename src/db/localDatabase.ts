import Dexie, { type Table } from 'dexie';
import { type EquipmentData } from '../services/apiRouter';

export interface FavoriteEquipment extends EquipmentData {
  stars: number; // 1 a 5
  dateAdded: number;
  notes: string;
}

export interface SearchHistoryEntry {
  id?: number;
  query: string;
  timestamp: number;
  resultsCount: number;
  mode: string;
}

export interface Rig {
  id: string;
  name: string;
  description: string;
  items: string[]; // Lista de IDs de equipamentos favoritos
  dateCreated: number;
}

export interface EquipmentNote {
  equipmentId: string;
  content: string;
  lastUpdated: number;
}

export class CapIAuCurIADatabase extends Dexie {
  favorites!: Table<FavoriteEquipment>;
  searchHistory!: Table<SearchHistoryEntry>;
  rigs!: Table<Rig>;
  notes!: Table<EquipmentNote>;

  constructor() {
    super('CapIAuCurIADatabase');
    this.version(1).stores({
      favorites: 'id, name, category, stars, dateAdded',
      searchHistory: '++id, query, timestamp',
      rigs: 'id, name, dateCreated',
      notes: 'equipmentId',
    });
  }
}

export const db = new CapIAuCurIADatabase();
