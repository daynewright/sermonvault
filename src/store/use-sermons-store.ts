import { create } from 'zustand';

interface SermonStore {
  refreshCounter: number;
  refreshSermons: () => void;
  sermonCount: number;
  setSermonCount: (count: number) => void;
  loadingSermons: boolean;
  setLoadingSermons: (loading: boolean) => void;
}

export const useSermonsStore = create<SermonStore>((set) => ({
  loadingSermons: true,
  setLoadingSermons: (loading: boolean) => set({ loadingSermons: loading }),
  refreshCounter: 0,
  refreshSermons: () => set((state) => ({ refreshCounter: state.refreshCounter + 1 })),
  sermonCount: 0,
  setSermonCount: (count: number) => set({ sermonCount: count }), 
})); 
