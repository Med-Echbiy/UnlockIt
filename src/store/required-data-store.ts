import { create } from "zustand";

interface State {
  setSteamApiKey: (key: string) => void;
  getSteamApiKey: () => string;
}

const useRequiredDataStore = create<State>(() => {
  let steamApiKey = window.localStorage.getItem("steamApiKey") || "";
  return {
    setSteamApiKey: (key: string) => {
      steamApiKey = key;
      window.localStorage.setItem("steamApiKey", key);
    },
    getSteamApiKey: () => steamApiKey,
  };
});

export default useRequiredDataStore;
