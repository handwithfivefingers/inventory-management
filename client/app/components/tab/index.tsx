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
    <div className="flex flex-col gap-2">
      <div className="flex">
        <div className="flex rounded-md shrink-0 bg-slate-50 border-slate-900/10 border">
          {props.items.map((tab, index) => {
            return (
              <button
                type="button"
                className={cn(
                  "px-4 transition-all py-1.5 text-sm cursor-pointer active:translate-y-0.25 active:shadow-inner",

                  {
                    "bg-indigo-700 text-white": tab.value === activeValue,
                    "rounded-l": index === 0,
                    "rounded-r": index === props.items.length - 1,
                    "border-l border-primary/20": index !== 0,
                  },
                )}
                onClick={() => setActiveValue(tab.value)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-4 bg-slate-50 rounded-md">{activeTab?.content}</div>
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
