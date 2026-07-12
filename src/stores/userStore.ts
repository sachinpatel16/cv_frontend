import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  gridMin: number;
  gridMax: number;
  currentGridCols: number;
  setGridMin: (min: number) => void;
  setGridMax: (max: number) => void;
  setCurrentGridCols: (cols: number) => void;
  cycleGridCols: () => void;

  // Toggle states for Investigations and Legacy Services
  showNewInvestigation: boolean;
  showInvestigation: boolean;
  showHistory: boolean;
  showObjectCount: boolean;
  showActivityDetection: boolean;
  showPeopleAnalytics: boolean;
  showGallery: boolean;

  setShowNewInvestigation: (val: boolean) => void;
  setShowInvestigation: (val: boolean) => void;
  setShowHistory: (val: boolean) => void;
  setShowObjectCount: (val: boolean) => void;
  setShowActivityDetection: (val: boolean) => void;
  setShowPeopleAnalytics: (val: boolean) => void;
  setShowGallery: (val: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      gridMin: 3,
      gridMax: 5,
      currentGridCols: 4,
      setGridMin: (min) =>
        set((state) => {
          const nextMax = state.gridMax < min + 1 ? min + 1 : state.gridMax;
          let nextCurrent = state.currentGridCols;
          if (nextCurrent < min) nextCurrent = min;
          if (nextCurrent > nextMax) nextCurrent = nextMax;
          return {
            gridMin: min,
            gridMax: nextMax,
            currentGridCols: nextCurrent,
          };
        }),
      setGridMax: (max) =>
        set((state) => {
          const nextMin = state.gridMin > max - 1 ? max - 1 : state.gridMin;
          let nextCurrent = state.currentGridCols;
          if (nextCurrent < nextMin) nextCurrent = nextMin;
          if (nextCurrent > max) nextCurrent = max;
          return {
            gridMin: nextMin,
            gridMax: max,
            currentGridCols: nextCurrent,
          };
        }),
      setCurrentGridCols: (cols) =>
        set((state) => ({
          currentGridCols: Math.min(
            state.gridMax,
            Math.max(state.gridMin, cols),
          ),
        })),
      cycleGridCols: () =>
        set((state) => {
          const nextCols =
            state.currentGridCols >= state.gridMax
              ? state.gridMin
              : state.currentGridCols + 1;
          return { currentGridCols: nextCols };
        }),

      // Defaults to true (shown by default)
      showNewInvestigation: false,
      showInvestigation: true,
      showHistory: true,
      showObjectCount: false,
      showActivityDetection: false,
      showPeopleAnalytics: false,
      showGallery: false,

      setShowNewInvestigation: (val) => set({ showNewInvestigation: val }),
      setShowInvestigation: (val) => set({ showInvestigation: val }),
      setShowHistory: (val) => set({ showHistory: val }),
      setShowObjectCount: (val) => set({ showObjectCount: val }),
      setShowActivityDetection: (val) => set({ showActivityDetection: val }),
      setShowPeopleAnalytics: (val) => set({ showPeopleAnalytics: val }),
      setShowGallery: (val) => set({ showGallery: val }),
    }),
    {
      name: 'vigilens-user-preferences',
    },
  ),
);
