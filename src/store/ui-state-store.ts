import { create } from "zustand";
interface State {
  isAddGameLoading: boolean;
  setAddGameLoading: (loading: boolean) => void;
  gameLoadingName: string;
  setGameLoadingName: (name: string) => void;
  addGameLoadingProgress: number;
  setAddGameLoadingProgress: (progress: number) => void;
}
const useUIStateStore = create<State>((set) => ({
  isAddGameLoading: false,
  setAddGameLoading: (loading) => set({ isAddGameLoading: loading }),
  gameLoadingName: "",
  setGameLoadingName: (name) => set({ gameLoadingName: name }),
  addGameLoadingProgress: 0,
  setAddGameLoadingProgress: (progress) =>
    set({ addGameLoadingProgress: progress }),
}));

export default useUIStateStore;
