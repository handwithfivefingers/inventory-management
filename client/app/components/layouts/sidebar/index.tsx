import { Link, useLocation } from "@remix-run/react";
import { useMemo, useState } from "react";
import { Icon } from "~/components/icon";
import { SIDE_BAR } from "~/constants/sidebar";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";

interface ISidebarItem extends BaseProps {
  to?: string;
  label: string;
  iconName?: string;
  isActive?: boolean;
  index: number;
  items?: ILinkItem[];
}

interface ILinkItem extends BaseProps {
  to: string;
  label: string;
  iconName?: string;
  isActive?: boolean;
  isChildren?: boolean;
}
const DEFAULT_SPEED = 250;

export const Sidebar = () => {
  let location = useLocation();
  return (
    <div className="flex flex-col h-full flex-1 p-2 rounded-md  gap-1">
      {SIDE_BAR?.map((sideItem, index) => (
        <SideBarItem
          to={sideItem.to}
          key={sideItem.to}
          label={sideItem.label}
          iconName={sideItem?.iconName}
          isActive={
            sideItem?.to && sideItem.index
              ? location.pathname === sideItem.to
              : sideItem?.to
              ? location.pathname.includes(sideItem?.to)
              : false || false
          }
          items={sideItem.items}
          index={index}
        />
      ))}
    </div>
  );
};

const SideBarItem = (props: ISidebarItem) => {
  const { iconName, to, className, label, isActive, items, index } = props;
  let location = useLocation();
  const [isExpand, setIsExpand] = useState<boolean>(true);
  const isContainActiveMenu = items?.length && items?.filter((item) => item.to === location.pathname)?.length;
  const menuMemoiz = useMemo(() => {
    if (!items?.length) {
      return <LinkItem to={to || "#"} isActive={isActive} label={label} iconName={iconName} className={className} />;
    }
    return (
      <div className="flex gap-0.5 flex-col relative">
        <div
          className="absolute w-[1px]  from-[5px] to-[calc(100%-5px)] mask-linear-[180deg,transparent_10%,black,transparent_80%]  bg-indigo-600 dark:bg-slate-200  rounded-full left-7"
          style={{ height: isExpand ? items.length * 40 + "px" : "0px", transition: "all 0.15s ease-in" }}
        />
        <div
          className={cn("w-full pl-10 gap-1 flex-col flex", {})}
          style={{
            height: isExpand ? items.length * 44 + "px" : "0px",
            transition: "all 0.1s ease-in",
            opacity: isExpand ? 1 : 0,
            visibility: isExpand ? "visible" : "hidden",
          }}
        >
          {items.map((item, i: number) => {
            return (
              <LinkItem
                to={item.to}
                isActive={location.pathname.includes(item.to)}
                label={item.label}
                iconName={item.iconName}
                className={className}
                isChildren={items.length > 0}
                key={`${item.label + item.to + index + i}`}
              />
            );
          })}
        </div>
      </div>
    );
  }, [items, isExpand, location]);

  return (
    <div className="flex flex-col gap-0.5">
      {items?.length && (
        <div
          className={cn(
            "py-1 transition-all rounded-md flex gap-2 justify-between pl-2 cursor-pointer text-indigo-950 hover:text-indigo-600 dark:hover:text-slate-800/80 dark:text-slate-200",
            {
              ["text-indigo-600 dark:text-slate-200"]: isContainActiveMenu,
            }
          )}
          onClick={() => setIsExpand(!isExpand)}
        >
          <div className="flex gap-2 px-2 items-center">
            <Icon name={iconName || "chevron-down"} className={cn("min-w-7  px-[5px]  dark:text-slate-200")} />
            <div className="flex-shrink-0 text-sm">{label}</div>
          </div>
          <Icon
            name="chevron-down"
            className={cn("w-5")}
            style={{
              transition: "transform 0.2s ease-out",
              transform: `rotate(${isExpand ? "180deg" : "0deg"})`,
            }}
          />
        </div>
      )}
      {menuMemoiz}
    </div>
  );
};

const LinkItem = ({ to, isActive, className, label, iconName, isChildren }: ILinkItem) => {
  return (
    <Link
      to={to || "#"}
      className={cn("py-1 hover:bg-white  dark:hover:bg-slate-800/80 transition-all rounded-md relative", className, {
        ["bg-white dark:bg-slate-800/80 shadow-lg"]: isActive,
      })}
    >
      {isChildren && (
        <div className="w-1 h-1 ring-[2px] ring-indigo-600 rounded-full absolute -left-[11px] top-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-50" />
      )}
      <div className="flex gap-2 relative py-1 px-4">
        {iconName && (
          <Icon
            name={iconName}
            className={cn("min-w-7  px-[5px]  text-indigo-950 dark:text-slate-200", {
              [" text-indigo-600 dark:text-slate-200"]: isActive,
            })}
          />
        )}
        <div
          className={cn("text-indigo-950   dark:text-slate-200 text-sm", {
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
  );
};
