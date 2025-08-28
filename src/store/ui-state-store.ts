import { create } from "zustand";
interface State {
  isAddGameLoading: boolean;
  setAddGameLoading: (loading: boolean) => void;
  gameLoadingName: string;
  setGameLoadingName: (name: string) => void;
  addGameLoadingProgress: number;
  setAddGameLoadingProgress: (progress: number) => void;
  confirmationModal: {
    status: boolean;
    actionText: string;
    onConfirm?: () => void;
    onCancel: () => void;
  };
  setConfirmationModal: (
    s: boolean,
    action: string,
    onConfirm?: () => void
  ) => void;
}
const useUIStateStore = create<State>((set) => ({
  isAddGameLoading: false,
  setAddGameLoading: (loading) => set({ isAddGameLoading: loading }),
  gameLoadingName: "",
  setGameLoadingName: (name) => set({ gameLoadingName: name }),
  addGameLoadingProgress: 0,
  setAddGameLoadingProgress: (progress) =>
    set({ addGameLoadingProgress: progress }),
  confirmationModal: {
    status: false,
    actionText: "",
    onConfirm: undefined,
    onCancel: () =>
      set((state) => ({
        confirmationModal: {
          ...state.confirmationModal,
          status: false,
          actionText: "",
          onConfirm: undefined,
        },
      })),
  },
  setConfirmationModal: (status, actionText, onConfirm) => {
    set((state) => ({
      confirmationModal: {
        ...state.confirmationModal,
        status,
        actionText,
        onConfirm,
        onCancel: () =>
          set((s) => ({
            confirmationModal: {
              ...s.confirmationModal,
              status: false,
              actionText: "",
              onConfirm: undefined,
            },
          })),
      },
    }));
  },
}));

export default useUIStateStore;
