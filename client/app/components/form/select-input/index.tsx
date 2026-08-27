import React, { HTMLInputTypeAttribute, useEffect, useRef, useState } from "react";
import { Icon } from "~/components/icon";
import { Portal } from "~/components/portal";
import { DROPDOWN_PANEL_CLASS, useDropdownPosition } from "~/hooks";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";
import styles from "./styles.module.scss";
import { m } from "motion/react";
export interface ISelectInput extends BaseProps, React.InputHTMLAttributes<HTMLInputTypeAttribute> {
  label?: string;
  name?: string;
  prefix?: string | React.ReactNode | any;
  suffix?: string | React.ReactNode | any;
  placeholder?: string;
  value?: string | number | undefined;
  type?: string | undefined | any;
  options: any[];
  inputSize?: "xs" | "sm" | "md";
}

type actions = {
  closeOnSelect?: boolean;
  onClick?: any;
  onSelect?: (value: string | number, option: any) => void;
};
const SizeClass = {
  xs: "py-1 px-1.5 text-xs",
  sm: "py-1 px-2 text-sm",
  md: "py-2 px-4 text-sm",
};

export const SelectInput = ({
  label,
  name,
  prefix,
  placeholder,
  className,
  style,
  onChange,
  suffix,
  options,
  onClick,
  onSelect,
  inputSize,
  closeOnSelect = true,
  required,
  ...rest
}: ISelectInput & actions) => {
  const wrapper = useRef<HTMLDivElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);
  const skeleton = useRef<HTMLDivElement>(null);
  const [isFocus, setIsFocus] = useState<boolean>(false);

  // Keep the dropdown glued to the input on scroll / resize.
  useDropdownPosition(isFocus, wrapper, dropdown);

  useEffect(() => {
    if (isFocus) {
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
      setTimeout(() => {
        document.addEventListener("click", handler, false);
      }, 0);
    }
    return () => document.removeEventListener("click", handler, false);
  }, [isFocus]);

  const removeFocus = () => {
    if (skeleton.current) {
      skeleton.current?.classList?.remove("ring-2");
      skeleton.current?.classList?.remove("ring-inset");
      skeleton.current?.classList?.remove("ring-indigo-600");
    }
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
  };
  const selectedOption = options.find((option) => option.value == rest.value);

  return (
    <div className={styles.inputWrapper}>
      <InputLabel label={label} name={name} required={required} />
      <div
        className={cn("relative rounded-md flex items-center w-full bg-slate-50 dark:bg-slate-700", className)}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
          setIsFocus(true);
          if (onClick) {
            onClick(e);
          }
        }}
        ref={wrapper}
      >
        <div
          className={cn(
            "z-1 absolute pt-0.5 w-full bg-transparent rounded-md border-0  text-slate-700 dark:text-slate-300  placeholder:text-gray-400  text-sm/6 outline-none",
            SizeClass[inputSize || "sm"],
          )}
          style={{
            width: "calc(100% - 28px)",
            maxHeight: "30px",
            overflow: "hidden",
          }}
        >
          {selectedOption?.label}
        </div>
        <input
          className={cn(
            "block w-full bg-transparent rounded-md cursor-pointer",
            "ring-2 ring-transparent transition-all focus:ring-indigo-400/30 border border-slate-300 outline-none",
            "text-transparent placeholder:text-gray-400",
            SizeClass[inputSize || "sm"],
            styles.input,
          )}
          readOnly
          {...(rest as any)}
        />
        <m.div
          className="absolute right-2 top-1/2 -translate-y-1/2 z-[1] "
          animate={{
            rotate: isFocus ? 180 : 0,
          }}
        >
          <Icon name="chevron-down" className={cn(" text-indigo-600 w-5 transition-transform ", {})} />
        </m.div>
      </div>

      <Portal>
        {isFocus && (
          <>
            <m.div
              className={DROPDOWN_PANEL_CLASS}
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
                {options?.map((item, index) => {
                  return (
                    <li
                      value={item.value}
                      className={cn(
                        "px-2 cursor-pointer rounded-xs py-1 text-sm",
                        "bg-white hover:bg-slate-100 dark:bg-transparent dark:hover:bg-slate-500",
                        "text-neutral-700/90 hover:text-neutral-900 dark:text-slate-300",
                      )}
                      onClick={(e: any) => handleSelect(item)}
                      key={`${item.label}-${item.value}-${index}`}
                    >
                      <div className="flex gap-2 items-center">
                        <span>{item.label}</span>
                        <div
                          className={cn({
                            "opacity-100": item.value === selectedOption?.value,
                            "opacity-0": item.value !== selectedOption?.value,
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
          </>
        )}
      </Portal>
    </div>
  );
};

// const InputLabel = ({ label, name }: { label?: string; name?: string }) => {
//   if (!label) return;
//   return (
//     <label htmlFor={name} className="block text-sm/6 font-medium text-gray-900 dark:text-slate-200">
//       {label}
//     </label>
//   );
// };

const InputLabel = ({ label, name, required }: { label?: string; name?: string; required?: boolean }) => {
  if (!label) return;
  return (
    <label htmlFor={name} className="block text-sm/6 font-medium text-gray-900 dark:text-slate-200">
      {label}
      {required && <span className="text-rose-600"> *</span>}
    </label>
  );
};
