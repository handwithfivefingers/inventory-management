import React, { useState } from "react";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";

interface ITMTab {
  active: string;
  items: ITabItem[];
}

interface ITabItem {
  content: React.ReactNode;
  label: React.ReactNode;
  value: string;
}

export const TMTab = ({ active, items }: ITMTab) => {
  const [currentTab, setCurrentTab] = useState<string>(active);
  return (
    <div>
      <div className="flex">
        {items.map((item, i) => {
          return (
            <div
              className={cn(
                "px-4 py-1.5 bg-transparent border border-b-0 border-slate-400 rounded-b-none cursor-pointer",
                {
                  ["rounded-tl-md"]: i === 0,
                  ["border-l-0"]: i && i < items.length,
                  ["rounded-tr-md"]: i === items.length - 1,
                  ["text-white bg-slate-700"]: currentTab == item.value,
                },
              )}
              onClick={() => setCurrentTab(item.value)}
            >
              {item.label}
            </div>
          );
        })}
      </div>
      <div className="px-2 py-2.5 border border-slate-400">
        {items.map((tab) => {
          return <TabContent isActive={tab.value === currentTab}>{tab.content}</TabContent>;
        })}
      </div>
    </div>
  );
};

interface ITMTabItem extends BaseProps {
  isActive: boolean;
}
const TabContent = ({ children, isActive }: ITMTabItem) => {
  return (
    <div
      className={cn("animate__animated animate__faster", {
        ["animate__fadeIn "]: isActive,
        ["animate__fadeOut hidden"]: !isActive,
      })}
    >
      {children}
    </div>
  );
};
TMTab.Item = TabContent;
