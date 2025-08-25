import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ReactNode } from "react";
import { Compass, HomeIcon, Settings, Timer, Unlock } from "lucide-react";
import GroupBySideBar from "../shared/groupBy-sidebar";
// note you need to get last played based on last played store in local storage or files better  files for fimliarity with rust filesystem
export function Sidebar({ children }: { children: ReactNode }) {
  //
  return (
    <section className=''>
      <SidebarProvider>
        <SidebarUI>
          <SidebarHeader className='py-4'>
            <h2 className='font-bold text-lg flex items-center gap-2'>
              {" "}
              <Unlock /> UnlockIt
            </h2>
          </SidebarHeader>
          <SidebarContent className='px-4'>
            <GroupBySideBar
              icon={Compass}
              groupLabel='Navigation'
              items={[
                {
                  label: "Home",
                  url: "/",
                  icon: HomeIcon,
                },
                {
                  label: "Settings",
                  url: "/settings",
                  icon: Settings,
                },
              ]}
            />
            <GroupBySideBar
              groupLabel='Last Played'
              icon={Timer}
              items={[
                {
                  label: "Cyberpunk 2077",
                  url: "/item-1",
                  img: "https://w0.peakpx.com/wallpaper/239/440/HD-wallpaper-cyberpunk-nun-tattoo-fantasy-cyber-girl-face-pink-art-asian-cyberpunk.jpg",
                },
              ]}
            />
          </SidebarContent>
          <SidebarFooter className='py-4' />
        </SidebarUI>
        <main className='flex-1 overflow-auto'>
          <SidebarTrigger />
          {children}
        </main>
      </SidebarProvider>
    </section>
  );
}
