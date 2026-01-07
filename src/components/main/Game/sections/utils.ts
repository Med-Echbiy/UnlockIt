import {
  CircleDot,
  CheckCircle2,
  GamepadIcon,
  Medal,
  Trophy,
  Trash,
  Star,
  XCircle,
  Award,
  Gem,
} from "lucide-react";
import { GameStoreData } from "@/types/Game";

// Helper function to detect crack type from file path
export function detectCrackType(filePath: string): {
  type: string;
  displayName: string;
  color: string;
} {
  const path = filePath.toLowerCase();

  // Check for TENOKE (SteamData folder with user_stats.ini or achievements.ini)
  if (path.includes("steamdata") || path.includes("tenoke")) {
    return { type: "TENOKE", displayName: "TENOKE", color: "bg-pink-500" };
  }
  // Check for Valve folder, valve.ini or ALI213 SteamEmu
  else if (
    path.includes("\\valve\\") ||
    path.includes("/valve/") ||
    path.includes("valve.ini") ||
    path.includes("ali213")
  ) {
    return {
      type: "ALI213",
      displayName: "ALI213 SteamEmu",
      color: "bg-blue-500",
    };
  } else if (path.includes("gse saves") || path.includes("goldberg")) {
    return {
      type: "GOLDBERG",
      displayName: "Goldberg Emulator",
      color: "bg-green-500",
    };
  } else if (path.includes("rune")) {
    return { type: "RUNE", displayName: "RUNE", color: "bg-purple-500" };
  } else if (path.includes("codex")) {
    return { type: "CODEX", displayName: "CODEX", color: "bg-orange-500" };
  } else if (path.includes("onlinefix") || path.includes("online fix")) {
    return {
      type: "ONLINE_FIX",
      displayName: "OnlineFix",
      color: "bg-cyan-500",
    };
  } else if (path.includes("steam_config")) {
    return {
      type: "STEAM_CONFIG",
      displayName: "Steam Config",
      color: "bg-indigo-500",
    };
  } else if (path.includes("empress")) {
    return { type: "EMPRESS", displayName: "EMPRESS", color: "bg-red-500" };
  }

  return {
    type: "UNKNOWN",
    displayName: "Unknown Emulator",
    color: "bg-gray-500",
  };
}

export const getStatusIcon = (status: GameStoreData["status"]) => {
  const iconMap = {
    "not-played": CircleDot,
    playing: GamepadIcon,
    played: CheckCircle2,
    completed: Trophy,
    beaten: Medal,
    trash: Trash,
  };
  return iconMap[status] || CircleDot;
};

export const getStatusColor = (status: GameStoreData["status"]) => {
  const colorMap = {
    "not-played": "text-gray-400 bg-gray-100 hover:bg-gray-200 border-gray-300",
    playing: "text-blue-400 bg-blue-100 hover:bg-blue-200 border-blue-300",
    played: "text-green-400 bg-green-100 hover:bg-green-200 border-green-300",
    completed:
      "text-yellow-400 bg-yellow-100 hover:bg-yellow-200 border-yellow-300",
    beaten:
      "text-purple-400 bg-purple-100 hover:bg-purple-200 border-purple-300",
    trash: "text-red-400 bg-red-100 hover:bg-red-200 border-red-300",
  };
  return colorMap[status] || colorMap["not-played"];
};

export const getRatingTier = (rating: string) => {
  if (rating === "N/A") return "na";
  const numRating = Number(rating);
  if (numRating <= 10) return "red";
  if (numRating <= 30) return "bronze";
  if (numRating <= 60) return "silver";
  if (numRating <= 90) return "gold";
  return "diamond";
};

export const getRatingIcon = (rating: string) => {
  const tier = getRatingTier(rating);
  const iconMap = {
    na: Star,
    red: XCircle,
    bronze: Medal,
    silver: Award,
    gold: Trophy,
    diamond: Gem,
  };
  return iconMap[tier] || Star;
};

export const getRatingStyles = (rating: string) => {
  const tier = getRatingTier(rating);
  const styleMap = {
    na: "text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-300",
    red: "text-red-600 bg-red-50 hover:bg-red-100 border-red-300",
    bronze: "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300",
    silver: "text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-300",
    gold: "text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border-yellow-300",
    diamond: "text-cyan-600 bg-cyan-50 hover:bg-cyan-100 border-cyan-300",
  };
  return styleMap[tier] || styleMap.na;
};

export const getRatingLabel = (rating: string) => {
  const tier = getRatingTier(rating);
  const labelMap = {
    na: "N/A",
    red: "Poor",
    bronze: "Fair",
    silver: "Good",
    gold: "Great",
    diamond: "Masterpiece",
  };
  return labelMap[tier] || "N/A";
};
