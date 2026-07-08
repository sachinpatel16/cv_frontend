import { create } from 'zustand';
import toast from 'react-hot-toast';
import { deleteObjectCountMedia } from '@/lib/api/objectcount';
import { deleteAnalyticsSession } from '@/lib/api/peopleanalytics';
import { useObjectCountingStore } from './objectCountingStore';
import { usePersonAnalysisStore } from './personAnalysisStore';

type ViewMode = 'list' | 'results';
type ResultsTabName = 'object-count' | 'person-analysis';

interface HistoryPageState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeResultsTab: ResultsTabName;
  setActiveResultsTab: (tab: ResultsTabName) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;

  // Custom Modal Delete State
  itemToDelete: { id: string; type: 'object-count' | 'person-analysis' } | null;
  setItemToDelete: (
    item: { id: string; type: 'object-count' | 'person-analysis' } | null,
  ) => void;

  // Actions
  loadHistory: () => Promise<void>;
  deleteHistoryItem: () => Promise<void>;
}

export const useHistoryPageStore = create<HistoryPageState>((set, get) => ({
  viewMode: 'list',
  setViewMode: (mode) => set({ viewMode: mode }),
  activeResultsTab: 'object-count',
  setActiveResultsTab: (tab) => set({ activeResultsTab: tab }),
  loading: false,
  setLoading: (l) => set({ loading: l }),

  itemToDelete: null,
  setItemToDelete: (item) => set({ itemToDelete: item }),

  loadHistory: async () => {
    set({ loading: true });
    try {
      const fetchObjectCountRuns = useObjectCountingStore.getState().fetchMedia;
      const fetchPersonSessions =
        usePersonAnalysisStore.getState().fetchSessions;
      await Promise.allSettled([fetchObjectCountRuns(), fetchPersonSessions()]);
    } finally {
      set({ loading: false });
    }
  },

  deleteHistoryItem: async () => {
    const { itemToDelete } = get();
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'object-count') {
        await deleteObjectCountMedia(itemToDelete.id);
      } else {
        await deleteAnalyticsSession(itemToDelete.id);
      }
      toast.success('Investigation deleted successfully');
      set({ itemToDelete: null });
      get().loadHistory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete investigation');
    }
  },
}));
