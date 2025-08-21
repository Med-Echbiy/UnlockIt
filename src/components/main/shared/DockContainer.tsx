import Dock from "@/animation-ui/Dock/Dock";
import settingsModalStore from "@/store/settings-modal-state";
import useAddGameWorkflow from "@/workflow/add-game-workflow";
import { Gamepad2Icon, HomeIcon, PlusIcon, SettingsIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

function DockContainer() {
  const navigate = useNavigate();
  const { toggle } = settingsModalStore();
  const { getGamePath } = useAddGameWorkflow();
  const items = [
    {
      icon: <HomeIcon size={18} />,
      label: "Home",
      onClick: () => navigate("/"),
    },
    {
      icon: <Gamepad2Icon size={18} />,
      label: "My Games",
      onClick: () => navigate("/games"),
    },
    {
      icon: <SettingsIcon size={18} />,
      label: "Settings",
      onClick: () => toggle(),
    },
    {
      icon: <PlusIcon size={18} />,
      label: "Add Game",
      onClick: async () => await getGamePath(),
    },
  ];
  return (
    <Dock items={items} panelHeight={68} baseItemSize={50} magnification={70} />
  );
}

export default DockContainer;
