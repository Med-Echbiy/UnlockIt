import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";

interface ProfileData {
  name: string;
  avatar: string | null; // base64 encoded image or file path
  notificationSound: string;
  createdAt: string;
  updatedAt: string;
}

interface ProfileStore {
  profile: ProfileData;
  setProfile: (profile: Partial<ProfileData>) => void;
  loadProfile: () => Promise<void>;
  saveProfile: () => Promise<void>;
  updateAvatar: (avatar: string) => void;
  updateName: (name: string) => void;
  updateNotificationSound: (sound: string) => void;
}

const defaultProfile: ProfileData = {
  name: "Gamer",
  avatar: null,
  notificationSound: "ps5.mp3",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: defaultProfile,

  setProfile: (updatedProfile) =>
    set((state) => ({
      profile: {
        ...state.profile,
        ...updatedProfile,
        updatedAt: new Date().toISOString(),
      },
    })),

  loadProfile: async () => {
    try {
      const store = await load("profile.json");
      const savedProfile = await store.get("userProfile");

      if (savedProfile) {
        set({ profile: savedProfile as ProfileData });
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
  },

  saveProfile: async () => {
    try {
      const { profile } = get();
      const store = await load("profile.json");
      await store.set("userProfile", profile);
      await store.save();
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
  },

  updateAvatar: (avatar) => {
    const { setProfile, saveProfile } = get();
    setProfile({ avatar });
    saveProfile();
  },

  updateName: (name) => {
    const { setProfile, saveProfile } = get();
    setProfile({ name });
    saveProfile();
  },

  updateNotificationSound: (notificationSound) => {
    const { setProfile, saveProfile } = get();
    setProfile({ notificationSound });
    saveProfile();
  },
}));

export default useProfileStore;
