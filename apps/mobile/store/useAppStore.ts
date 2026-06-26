import { create } from 'zustand';

interface AppState {
  user: any | null;
  setUser: (user: any) => void;
  isLoading: boolean;
  setLoading: (isLoading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isLoading: true,
  setLoading: (isLoading) => set({ isLoading }),
}));
