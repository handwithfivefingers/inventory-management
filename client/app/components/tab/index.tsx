import { useState } from "react";
import { cn } from "~/libs/utils";

interface Props {
  items: TabItem[];
  defaultActive?: string;
  onChange?: (value: string) => void;
  className?: string;
  active: string;
}

interface TabItem {
  content: React.ReactElement;
  label: React.ReactNode;
  value: string;
}

export const Tab = (props: Props) => {
  // Track only the active value; the item itself is derived from props on
  // every render so freshly-created `content` elements (e.g. a parent
  // toggling between view/edit mode) are picked up.
  const [activeValue, setActiveValue] = useState(
    props.items.find((tab) => tab.value === props.active)?.value ?? props.items[0]?.value,
  );
  const activeTab = props.items.find((tab) => tab.value === activeValue) ?? props.items[0];
  return (
    <div>
      <div className="flex gap-2 bg-slate-200 p-2 rounded ">
        {props.items.map((tab) => {
          return (
            <button
              type="button"
              className={cn("px-2 hover:bg-slate-100 rounded py-1 cursor-pointer", {
                "bg-white": tab.value === activeTab?.value,
              })}
              onClick={() => setActiveValue(tab.value)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div>{activeTab?.content}</div>
    </div>
  );
};

export const NoTab = () => {
  return (
    <div>
      <div>No Tab</div>
    </div>
  );
};
