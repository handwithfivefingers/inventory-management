import { Link, useLocation } from "@remix-run/react";
import { Icon } from "~/components/icon";
import { SIDE_BAR } from "~/constants/sidebar";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";

export const Sidebar = () => {
  const location = useLocation();
  return (
    <div className="flex flex-col h-full flex-1 p-2 rounded-md  gap-2">
      {SIDE_BAR?.map((sideItem) => (
        <SideBarItem
          to={sideItem.to}
          key={sideItem.to}
          label={sideItem.label}
          iconName={sideItem.iconName}
          isActive={sideItem.index ? location.pathname === sideItem.to : location.pathname.includes(sideItem.to)}
          divider={sideItem?.divider}
        />
      ))}
    </div>
  );
};

interface ISidebarItem extends BaseProps {
  to: string;
  label: string;
  iconName: string;
  isActive?: boolean;
  divider?: string;
}
const SideBarItem = ({ iconName, to, className, label, isActive, divider }: ISidebarItem) => {
  return (
    <>
      {divider && (
        <div className="flex items-center gap-2 text-sm">
          <div className="mt-1 bg-indigo-600/30 h-0.5 w-full rounded-full"></div>
          <div className="flex-shrink-0 text-indigo-950/50">{divider}</div>
          <div className="mt-1 bg-indigo-600/30 h-0.5 w-full rounded-full"></div>
        </div>
      )}
      <Link
        to={to}
        className={cn("py-1 hover:bg-white  dark:hover:bg-slate-800/80 transition-all rounded-md", className, {
          ["bg-white dark:bg-slate-800/80 shadow-lg"]: isActive,
        })}
      >
        <div className="flex gap-2 relative py-1 px-4">
          <Icon
            name={iconName}
            className={cn("min-w-7  px-[5px]  text-indigo-950 dark:text-slate-200", {
              [" text-indigo-600 dark:text-slate-200"]: isActive,
            })}
          />
          <div
            className={cn("text-indigo-950   dark:text-slate-200 text-md", {
              [" text-indigo-600 dark:text-slate-200"]: isActive,
            })}
          >
            {label}
          </div>
          <div
            className={cn("absolute top-0 right-1 w-[3px] bg-indigo-600 dark:bg-indigo-50 z-10 h-full rounded-md", {
              ["hidden"]: !isActive,
            })}
          />
        </div>
      </Link>
    </>
  );
};
