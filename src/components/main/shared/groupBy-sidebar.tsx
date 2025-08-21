import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface SidebarItem {
  children?: ReactNode;
  label: ReactNode;
  url: string;
  img?: string;
  icon?: LucideIcon;
}

interface Props {
  groupLabel: ReactNode;
  items: SidebarItem[];
  icon: LucideIcon;
}

export default function GroupBySideBar({
  groupLabel,
  items,
  icon: Icon,
}: Props) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className='flex items-center gap-2 mb-2'>
        {" "}
        <Icon /> {groupLabel}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item, index) => (
            <SidebarMenuItem key={index}>
              <SidebarMenuButton asChild>
                <Link to={item.url}>
                  {item.icon ? (
                    <item.icon className='mr-2' />
                  ) : item.img ? (
                    <img
                      className='object-cover aspect-square max-w-[30px] w-full h-[30px] rounded-full'
                      src={item.img}
                      alt={item.label as string}
                    />
                  ) : null}
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
