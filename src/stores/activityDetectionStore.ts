import { create } from 'zustand';
import { mockActivityResults } from '@/lib/mock/stats';

type Results = typeof mockActivityResults | null;

interface ActivityDetectionState {
  file: File | null;
  triggers: string[];
  running: boolean;
  results: Results;
  setFile: (f: File | null) => void;
  toggleTrigger: (id: string) => void;
  run: () => Promise<void>;
  reset: () => void;
}

export const useActivityDetectionStore = create<ActivityDetectionState>(
  (set, get) => ({
    file: null,
    triggers: ['loitering', 'perimeter', 'crowd'],
    running: false,
    results: null,

    setFile: (f) => set({ file: f }),

    toggleTrigger: (id) =>
      set((s) => ({
        triggers: s.triggers.includes(id)
          ? s.triggers.filter((t) => t !== id)
          : [...s.triggers, id],
      })),

    run: async () => {
      if (!get().file) return;
      set({ running: true });
      await new Promise((r) => setTimeout(r, 2000));
      set({ results: mockActivityResults, running: false });
    },

    reset: () => set({ file: null, results: null }),
  }),
);
