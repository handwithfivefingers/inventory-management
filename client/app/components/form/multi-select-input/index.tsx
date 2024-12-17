import React, { ChangeEvent, HTMLInputTypeAttribute, useEffect, useMemo, useRef, useState } from "react";
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
  inputClassName?: string;
  options: { label?: string; value?: string | number }[] | [];
  limit?: number;
  style?: React.CSSProperties;
  // onChange: (value: string[] | number[], opt: any) => void;
}

type actions = {
  closeOnSelect?: boolean;
  onClick?: any;
  onSelect?: (value: string[] | number[], option: any) => void;
};

export const MultiSelectInput = ({
  label,
  name,
  prefix,
  placeholder,
  className,
  style,
  // onChange,
  inputClassName,
  suffix,
  options,
  onClick,
  onSelect,
  closeOnSelect = true,
  limit = 3,
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
    if (isFocus) {
      handleBounce();
      addFocus();
    } else {
      removeFocus();
    }
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
    dropdown.current?.style.setProperty("top", `${rect?.bottom}px`);
    dropdown.current?.style.setProperty("left", `${rect?.left}px`);
    dropdown.current?.style.setProperty("height", "auto");
    dropdown.current?.style.setProperty("z-index", "999");
  };

  const removeFocus = () => {
    if (skeleton.current) {
      skeleton.current?.classList?.remove("ring-2");
      skeleton.current?.classList?.remove("ring-inset");
      skeleton.current?.classList?.remove("ring-indigo-600");
    }
    dropdown.current?.style.setProperty("height", "0");
    dropdown.current?.style.setProperty("z-index", "-1");
  };
  const addFocus = () => {
    if (skeleton.current) {
      skeleton.current?.classList?.add("ring-2");
      skeleton.current?.classList?.add("ring-inset");
      skeleton.current?.classList?.add("ring-indigo-600");
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
        option
      );
    }
  };
  const removeOptions = (val: any) => {
    selected.delete(val);
    setSelected(selected);
    if (onSelect) {
      onSelect?.(
        [...selected.values()].map((item) => item.value),
        val
      );
    }
  };
  console.log("selected", rest.value);
  return (
    <div className={styles.inputWrapper} ref={wrapper}>
      {label ? (
        <label htmlFor={name} className="block text-sm/6 font-medium text-gray-900">
          {label}
        </label>
      ) : (
        ""
      )}
      <div
        className={cn("relative rounded-md flex items-center py-1.5 px-1 pl-2 ")}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
          setIsFocus(true);
          if (onClick) {
            onClick(e);
          }
        }}
      >
        <div
          className={cn(
            "min-h-6 flex flex-wrap gap-2 w-full bg-transparent rounded-md border-0  text-gray-900  placeholder:text-gray-400  text-sm/6 outline-none px-1 cursor-pointer",
            styles.input,
            inputClassName
          )}
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
          }) ||
            placeholder ||
            "Select"}
        </div>

        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-[1] px-1">
          <Icon
            name="chevron-down"
            className={cn(" text-indigo-600 w-5", styles.rotation, {
              [styles.rotationActive]: isFocus,
            })}
          />
        </div>
        <div
          className={cn(
            "absolute rounded-md left-0 top-0 w-full h-full ring-1 ring-gray-300  -z-[1] shadow-sm bg-white",
            styles.outline,
            className
          )}
          ref={skeleton}
        />
      </div>

      <Portal>
        {isFocus && (
          <>
            {options?.length ? (
              <div
                className={cn("animate__animated animate__faster animate__fadeInUp", styles.dropdown)}
                ref={dropdown}
                style={
                  {
                    "--animate-duration": "0.3s",
                  } as React.CSSProperties
                }
              >
                <ul className="max-h-[400px] overflow-y-auto py-2 px-1">
                  {options?.map((item) => {
                    return (
                      <li
                        value={item.value}
                        className={cn(
                          " px-2 hover:bg-indigo-200 cursor-pointer rounded bg-white transition-all text-neutral-700/90 hover:text-neutral-900 py-1 my-0.5",
                          {
                            "bg-indigo-200/60 text-neutral-900": selected.get(item.value),
                          }
                        )}
                        onClick={(e: any) => handleSelect(item)}
                      >
                        {item.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              ""
            )}
          </>
        )}
      </Portal>
    </div>
  );
};
