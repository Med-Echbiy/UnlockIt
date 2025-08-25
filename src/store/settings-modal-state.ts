import { create } from "zustand";

interface State {
  open: boolean;
  toggle: () => void;
}
const settingsModalStore = create<State>((set, get) => ({
  open: false,
  toggle: () => {
    set((state) => ({ open: !state.open }));
  },
}));
export default settingsModalStore;
