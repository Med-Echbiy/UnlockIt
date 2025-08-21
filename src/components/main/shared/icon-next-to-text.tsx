import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export default function IconNextToText({
  icon: Icon,
  children,
}: {
  children: ReactNode;
  icon: LucideIcon;
}) {
  return (
    <div className='flex items-center'>
      <Icon />
      <span className='ml-2'>{children}</span>
    </div>
  );
}
