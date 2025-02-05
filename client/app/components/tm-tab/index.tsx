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
        {/* <div
          className="px-4 py-1.5 bg-white border rounded-l-md rounded-b-none border-b-0"
          onClick={() => setCurrentTab("general")}
        >
          General
        </div>
        <div
          className="px-4 py-1.5 bg-white border border-l-0 border-r-0 border-b-0"
          onClick={() => setCurrentTab("payment")}
        >
          Thanh Toán
        </div>
        <div
          className="px-4 py-1.5 bg-white border rounded-r-md rounded-b-none border-b-0"
          onClick={() => setCurrentTab("role")}
        >
          Role
        </div> */}
        {items.map((item, i) => {
          return (
            <div
              className={cn("px-4 py-1.5 bg-white border border-b-0 rounded-b-none cursor-pointer", {
                ["rounded-tl-md  "]: i === 0,
                ["border-l-0"]: i && i < items.length,
                ["rounded-tr-md"]: i === items.length - 1,
                ["text-indigo-600"]: currentTab == item.value,
              })}
              onClick={() => setCurrentTab(item.value)}
            >
              {item.label}
            </div>
          );
        })}
      </div>
      <div className="px-2 py-2.5 border">
        {/* <div
          className={cn("animate__animated animate__faster", {
            ["animate__fadeIn"]: tab === "general",
            ["animate__fadeOut hidden"]: tab !== "general",
          })}
        >
          Content 1
        </div>
        <div
          className={cn("animate__animated animate__faster", {
            ["animate__fadeIn"]: tab === "display",
            ["animate__fadeOut hidden"]: tab !== "display",
          })}
        >
          Content 2
        </div>
        <div
          className={cn("animate__animated animate__faster", {
            ["animate__fadeIn"]: tab === "role",
            ["animate__fadeOut hidden"]: tab !== "role",
          })}
        >
          Content 3
        </div> */}
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
