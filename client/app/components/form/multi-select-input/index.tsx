import { m } from "motion/react";
import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { Icon } from "~/components/icon";
import { Portal } from "~/components/portal";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";
import styles from "./styles.module.scss";
export interface IMultiSelectInput extends BaseProps {
  label?: string;
  name?: string;
  prefix?: string | React.ReactNode | any;
  suffix?: string | React.ReactNode | any;
  placeholder?: string;
  value?: any[];
  type?: string | undefined | any;
  options: { label?: string; value?: string | number }[] | [];
  limit?: number;
  style?: React.CSSProperties;
  inputSize?: "xs" | "sm" | "md";
}

type actions = {
  closeOnSelect?: boolean;
  onClick?: any;
  onSelect?: (value: string[] | number[], option: any) => void;
};
const SizeClass = {
  xs: "py-1 px-1.5 text-xs",
  sm: "py-1 px-1 text-sm",
  md: "py-2 px-2 text-sm",
};

export const MultiSelectInput = ({
  label,
  name,
  prefix,
  placeholder = "Select",
  className,
  style,
  suffix,
  options,
  onClick,
  onSelect,
  closeOnSelect = true,
  limit = 3,
  inputSize,
  ...rest
}: IMultiSelectInput & actions) => {
  const wrapper = useRef<HTMLDivElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);
  const skeleton = useRef<HTMLDivElement>(null);
  const [isFocus, setIsFocus] = useState<boolean>(false);
  const [selected, setSelected] = useState(new Map());

  useEffect(() => {
    if (rest.value?.length) {
      const newMap = new Map();
      options?.map((item) => {
        const isSelected = (rest.value as any)?.includes(item.value);
        console.log("isSelected", isSelected);
        if (isSelected) newMap.set(item.value, item);
      });
      setSelected(newMap);
    }
  }, [options]);

  useEffect(() => {
    let resizeObserver: ResizeObserver;
    if (isFocus) {
      resizeObserver = new ResizeObserver(() => {
        handleBounce();
      });
      resizeObserver.observe(document.body);
      // capture phase is required: "scroll" does not bubble,
      // so scrolling inside nested containers won't reach document otherwise
      document.addEventListener("scroll", handleBounce, true);
      window.addEventListener("resize", handleBounce);
      handleBounce();
    }
    return () => {
      resizeObserver?.disconnect();
      document.removeEventListener("scroll", handleBounce, true);
      window.removeEventListener("resize", handleBounce);
    };
  }, [isFocus]);

  useEffect(() => {
    const handler = (e: any) => {
      if (!dropdown.current?.contains(e.target)) {
        setIsFocus(false);
        return;
      }
    };
    if (isFocus) {
      document.addEventListener("click", handler, false);
    }
    return () => document.removeEventListener("click", handler, false);
  }, [isFocus]);

  const handleBounce = () => {
    const rect = wrapper.current?.getBoundingClientRect();
    dropdown.current?.style.setProperty("left", `${rect?.left}px`);
    dropdown.current?.style.setProperty("height", "auto");
    dropdown.current?.style.setProperty("z-index", "999");
    dropdown.current?.style.setProperty("width", `${rect?.width}px`);
    const dropdownHeight = dropdown.current?.offsetHeight || 0;
    const isOverWindow = window.innerHeight - dropdownHeight < (rect?.bottom || 0);
    if (isOverWindow) {
      dropdown.current?.style.setProperty("top", `${(rect?.top || 0) - dropdownHeight}px`);
    } else {
      dropdown.current?.style.setProperty("top", `${rect?.bottom}px`);
    }
  };

  const handleSelect = (option: any) => {
    if (selected.has(option.value)) {
      selected.delete(option.value);
    } else {
      selected.set(option.value, option);
    }
    setSelected(selected);
    if (onSelect) {
      onSelect?.(
        [...selected.values()].map((item) => item.value),
        option,
      );
    }
  };
  const removeOptions = (val: any) => {
    selected.delete(val);
    setSelected(selected);
    if (onSelect) {
      onSelect?.(
        [...selected.values()].map((item) => item.value),
        val,
      );
    }
  };
  return (
    <div className={styles.inputWrapper} ref={wrapper}>
      <InputLabel label={label} name={name} />
      <div
        className={cn("relative rounded-md flex items-center py-1")}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
          setIsFocus(true);
          if (onClick) {
            onClick(e);
          }
        }}
      >
        <div
          className={cn(
            "min-h-6 flex flex-wrap gap-1 w-full bg-transparent rounded-md border-0  text-gray-900  placeholder:text-gray-400  text-sm/6 outline-none cursor-pointer",
            "ring-2 ring-transparent transition-all  border border-slate-300 outline-none",
            "text-slate-700 placeholder:text-gray-400",
            SizeClass[inputSize || "sm"],
            "pr-6",
            styles.input,
            {
              ["ring-indigo-400/30"]: isFocus,
            },
          )}
          ref={skeleton}
        >
          {rest.value?.map((item, index: number) => {
            if (index == limit)
              return (
                <div className="bg-indigo-50 px-2 flex gap-1 rounded" key="option-truncate">
                  <span className="text-slate-500">+{(rest.value?.length || 0) - limit}</span>
                </div>
              );
            return (
              <div className="bg-indigo-50 pl-1 pr-2 flex gap-1 rounded" key={`option-${item}-${index}`}>
                <Icon
                  name="x"
                  className="w-4 text-indigo-600"
                  onClick={(e: React.MouseEvent<ChangeEvent>) => {
                    e.preventDefault();
                    removeOptions(item);
                  }}
                />
                <span className="text-slate-500">{selected.get(item)?.label}</span>
              </div>
            );
          }) || placeholder}
        </div>

        <m.div
          className="absolute right-2 top-1/2 -translate-y-1/2 z-[1] "
          animate={{
            rotate: isFocus ? 180 : 0,
          }}
        >
          <Icon name="chevron-down" className={cn(" text-indigo-600 w-5 transition-transform rotate-0")} />
        </m.div>
      </div>

      <Portal>
        {isFocus && (
          <m.div
            className={cn(styles.dropdown, "border border-slate-300")}
            ref={dropdown}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ul className="max-h-[400px] overflow-y-auto p-1 flex flex-col gap-1">
              {options?.length <= 0 && (
                <li className="px-2 py-4 flex flex-col gap-2 justify-center items-center text-slate-500">
                  <Icon name="hard-drive" fontSize={28}></Icon>
                  <span>No options</span>
                </li>
              )}

              {options?.map((item) => {
                return (
                  <li
                    value={item.value}
                    className={cn(
                      " px-2 hover:bg-slate-100 cursor-pointer rounded bg-white transition-all text-neutral-700/90 hover:text-neutral-900 py-1",
                    )}
                    onClick={(e: any) => handleSelect(item)}
                  >
                    <div className="flex gap-2 items-center">
                      <span>{item.label}</span>
                      <div
                        className={cn("text-green-500", {
                          "opacity-100": selected.get(item.value),
                          "opacity-0": !selected.get(item.value),
                        })}
                      >
                        <Icon name="check" fontSize={16} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </m.div>
        )}
      </Portal>
    </div>
  );
};

const InputLabel = ({ label, name }: { label?: string; name?: string }) => {
  if (!label) return;
  return (
    <label htmlFor={name} className="block text-sm/6 font-medium text-gray-900">
      {label}
    </label>
  );
};
