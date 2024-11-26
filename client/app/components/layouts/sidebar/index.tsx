import { Link } from "@remix-run/react";
import { SIDE_BAR } from "~/constants/sidebar";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";

export const Sidebar = () => {
  return (
    <div className="flex flex-col h-full flex-1">
      {SIDE_BAR?.map((sideItem) => (
        <SideBarItem to={sideItem.to} key={sideItem.to} label={sideItem.label} />
      ))}
    </div>
  );
};

interface ISidebarItem extends BaseProps {
  to: string;
  label: string;
}
const SideBarItem = ({ to, className, label }: ISidebarItem) => {
  return (
    <Link to={to} className={cn("px-2 py-1 hover:bg-sky-200", className)}>
      {label}
    </Link>
  );
};
