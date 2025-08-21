import { create } from "zustand";

interface State {
  open: boolean;
  toggle: () => void;
}
const settingsModalStore = create<State>((set, get) => ({
  open: false,
  toggle: () => {
    console.log("Toggled settings modal");
    set((state) => ({ open: !state.open }));
    console.log(get().open);
  },
}));
export default settingsModalStore;
