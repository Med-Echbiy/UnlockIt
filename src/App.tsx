import "./index.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/main/Home/Home";
// import Settings from "./components/main/Settings/Settings";
import AnimatedContent from "./animation-ui/AnimatedContent";
import DockContainer from "./components/main/shared/DockContainer";
import Games from "./components/main/Game/Games";
import settingsModalStore from "./store/settings-modal-state";
import SettingsDialog from "./components/main/Settings/Settings";
import { Toaster } from "./components/ui/sonner";
import useInitialWorkflow from "./workflow/initial_workflow";

function App() {
  const { open } = settingsModalStore();
  const init = useInitialWorkflow();
  return (
    <Router>
      <AnimatedContent variant='slide'>
        {/* <Sidebar> */}
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/games' element={<Games />} />
          {/* <Route path='/settings' element={<Settings />} /> */}
        </Routes>
        {/* </Sidebar> */}
        {open && <SettingsDialog />}
        <DockContainer />
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
      </AnimatedContent>
    </Router>
  );
}

export default App;
