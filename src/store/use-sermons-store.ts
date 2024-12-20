import { create } from 'zustand';

interface SermonStore {
  refreshCounter: number;
  refreshSermons: () => void;
}

export const useSermonsStore = create<SermonStore>((set) => ({
  refreshCounter: 0,
  refreshSermons: () => set((state) => ({ refreshCounter: state.refreshCounter + 1 })),
})); 