import { exists } from "@tauri-apps/plugin-fs";

const sharedParsingWorkflow = () => {
  // Your implementation here
  const checkExePath = async (exePath: string) => {
    const check = await exists(exePath);
    return check;
  };
  return { checkExePath };
};

export default sharedParsingWorkflow;
