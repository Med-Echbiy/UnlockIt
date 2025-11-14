import "./index.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/main/Home/Home";
import DockContainer from "./components/main/shared/DockContainer";
import Games from "./components/main/Game/Games";
import settingsModalStore from "./store/settings-modal-state";
import useProfileStore from "./store/profile-store";
import SettingsDialog from "./components/main/Settings/Settings";
import { Toaster } from "./components/ui/sonner";
import useInitialWorkflow from "./workflow/initial_workflow";
import GameDetails from "./components/main/Game/game-details";
import { GamingLoader } from "./components/main/shared/add-game-loading";
import ConfirmationDialog from "./components/main/shared/confirmation-dialog";
import CheckConnection from "./components/main/shared/check-connection";
import useTrackingWorkflow from "./workflow/tracking-workflow";
import useSilentPercentageRefreshWorkflow from "./workflow/silent-percentage-refresh-workflow";
import { useEffect } from "react";
import { ScrollToTopWrapper } from "./components/main/shared/ScrollToTop";
import { checkForAppUpdates } from "./lib/updater";

function App() {
  const { open } = settingsModalStore();
  const { loadProfile } = useProfileStore();

  useInitialWorkflow();
  useTrackingWorkflow();
  useSilentPercentageRefreshWorkflow();

  useEffect(() => {
    loadProfile();

    // Disable browser's default scroll restoration
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    // Check for updates on startup (silently)
    setTimeout(() => {
      checkForAppUpdates().catch((error) => {
        console.error("Failed to check for updates:", error);
      });
    }, 3000); // Wait 3 seconds after startup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  return (
    <Router>
      <ScrollToTopWrapper>
        <div className='flex flex-col min-h-screen'>
          <div className='flex-1 flex flex-col'>
            {/* <Sidebar> */}
            <Routes>
              <Route path='/' element={<Home />} />
              <Route path='/games' element={<Games />} />
              {/* <Route path='/settings' element={<Settings />} /> */}
              <Route path='/game/:id' element={<GameDetails />} />
            </Routes>
            {/* </Sidebar> */}
            {open && <SettingsDialog />}
            <GamingLoader />
            <Toaster
              position='top-center'
              toastOptions={{
                style: {
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                },
              }}
              className='toaster group'
            />
          </div>
          <div className='mt-auto'>
            <DockContainer />
          </div>
          <ConfirmationDialog />
          <CheckConnection />
        </div>
      </ScrollToTopWrapper>
    </Router>
  );
}

export default App;
