import React, { HTMLInputTypeAttribute, useEffect, useRef, useState } from "react";
import { Icon } from "~/components/icon";
import { Portal } from "~/components/portal";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";
import styles from "./styles.module.scss";
export interface ISelectInput extends BaseProps, React.InputHTMLAttributes<HTMLInputTypeAttribute> {
  label?: string;
  name?: string;
  prefix?: string | React.ReactNode | any;
  suffix?: string | React.ReactNode | any;
  placeholder?: string;
  value?: string | number | undefined;
  type?: string | undefined | any;
  inputClassName?: string;
  options: any[];
}

type actions = {
  closeOnSelect?: boolean;
  onClick?: any;
  onSelect?: (value: string | number, option: any) => void;
};

export const SelectInput = ({
  label,
  name,
  prefix,
  placeholder,
  className,
  style,
  onChange,
  inputClassName,
  suffix,
  options,
  onClick,
  onSelect,
  closeOnSelect = true,
  ...rest
}: ISelectInput & actions) => {
  const wrapper = useRef<HTMLDivElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);
  const skeleton = useRef<HTMLDivElement>(null);
  const [isFocus, setIsFocus] = useState<boolean>(false);
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
        console.log("clicked outside");
        setIsFocus(false);
        return;
      }
      console.log("clicked inside");
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
    console.log("dropdown", dropdown.current);
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
    if (onSelect) {
      onSelect?.(option.value, option);
    }
    // if (closeOnSelect) {
    //   setIsFocus(false);
    // }
  };
  const selectedOption = options.find((option) => option.value === rest.value);

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
        <input
          className={cn(
            "block w-full bg-transparent rounded-md border-0   text-gray-900  placeholder:text-gray-400  text-sm/6 outline-none px-1",
            styles.input,
            inputClassName
          )}
          readOnly
          {...(rest as any)}
          value={selectedOption?.label}
        />
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
                            "bg-indigo-200/60 text-neutral-900": item.value === selectedOption?.value,
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
            {/* <div className="fixed top-0 left-0 right-0 bottom-0 z-[900]" onClick={() => setIsFocus(false)} /> */}
          </>
        )}
      </Portal>
    </div>
  );
};
