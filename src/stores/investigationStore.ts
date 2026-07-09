import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface InvestigationState {
  selectedMedia: any | null;
  setSelectedMedia: (media: any | null) => void;
  clearSelectedMedia: () => void;
}

export const useInvestigationStore = create<InvestigationState>()(
  persist(
    (set) => ({
      selectedMedia: null,
      setSelectedMedia: (media) => set({ selectedMedia: media }),
      clearSelectedMedia: () => set({ selectedMedia: null }),
    }),
    {
      name: 'investigation-storage',
    },
  ),
);
