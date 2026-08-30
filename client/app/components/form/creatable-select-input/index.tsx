import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "~/components/icon";
import { Portal } from "~/components/portal";
import { DROPDOWN_PANEL_CLASS, useDropdownPosition } from "~/hooks";
import { cn } from "~/libs/utils";
import styles from "./styles.module.scss";
import { m } from "motion/react";

export interface CreatableSelectOption {
  label: string;
  value: string;
}

interface Props {
  label?: string;
  placeholder?: string;
  value?: string;
  options: CreatableSelectOption[];
  onSelect: (value: string, option: CreatableSelectOption) => void;
  onCreate?: (input: string) => void;
  inputSize?: "xs" | "sm" | "md";
  required?: boolean;
  className?: string;
}

const SizeClass = {
  xs: "py-1 px-1.5 text-xs",
  sm: "py-1 px-2 text-sm",
  md: "py-2 px-4 text-sm",
};

export const CreatableSelectInput: React.FC<Props> = ({
  label,
  placeholder = "Select or type to create",
  value,
  options,
  onSelect,
  onCreate,
  inputSize,
  required,
  className,
}) => {
  const wrapper = useRef<HTMLDivElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocus, setIsFocus] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useDropdownPosition(isFocus, wrapper, dropdown);

  const selectedOption = useMemo(() => options.find((o) => o.value === value), [options, value]);

  useEffect(() => {
    if (!isFocus) {
      setInputValue("");
    } else {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isFocus]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!wrapper.current?.contains(target) && !dropdown.current?.contains(target)) setIsFocus(false);
    };
    if (isFocus) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isFocus]);

  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, inputValue]);

  const canCreate = useMemo(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    if (options.some((o) => o.value.toLowerCase() === lower || o.label.toLowerCase() === lower)) return false;
    if (value && value.toLowerCase() === lower) return false;
    return true;
  }, [inputValue, options, value]);

  const handleSelect = (opt: CreatableSelectOption) => {
    if ((opt as any).disabled) return;
    onSelect(opt.value, opt);
    setIsFocus(false);
    setInputValue("");
  };

  const handleCreate = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (onCreate) onCreate(trimmed);
    else {
      const newOpt = { label: trimmed, value: trimmed };
      onSelect(newOpt.value, newOpt);
    }
    setIsFocus(false);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (canCreate) handleCreate();
      else if (filtered.length === 1) handleSelect(filtered[0]);
      else if (filtered.length > 0) {
        const exact = filtered.find((o) => o.label.toLowerCase() === inputValue.trim().toLowerCase());
        if (exact) handleSelect(exact);
      }
    } else if (e.key === "Escape") {
      setIsFocus(false);
    }
  };

  return (
    <div className={styles.inputWrapper}>
      {label && (
        <label className="block text-sm/6 font-medium text-gray-900 dark:text-slate-200">
          {label}
          {required && <span className="text-rose-600"> *</span>}
        </label>
      )}
      <div
        ref={wrapper}
        onClick={() => setIsFocus(true)}
        className={cn("relative rounded-md flex items-center w-full bg-slate-50 dark:bg-slate-700 cursor-pointer", className)}
      >
        {/* display selected or input */}
        <div className={cn("relative flex items-center w-full", SizeClass[inputSize || "sm"])} style={{ minHeight: 32 }}>
          {!isFocus ? (
            <span className={cn("text-sm truncate", selectedOption ? "text-slate-700 dark:text-slate-300" : "text-gray-400")}>
              {selectedOption?.label || placeholder}
            </span>
          ) : (
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedOption?.label || placeholder}
              className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder:text-gray-400"
            />
          )}
        </div>
        <div className="absolute inset-0 border border-slate-300 rounded-md pointer-events-none" />
        <m.div className="absolute right-2 top-1/2 -translate-y-1/2" animate={{ rotate: isFocus ? 180 : 0 }}>
          <Icon name="chevron-down" className="text-primary w-5" />
        </m.div>
      </div>

      <Portal>
        {isFocus && (
          <m.div ref={dropdown} className={DROPDOWN_PANEL_CLASS} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <ul className="max-h-[300px] overflow-y-auto p-1 flex flex-col gap-1">
              {filtered.map((item: any, idx: number) => (
                <li
                  key={`${item.value}-${idx}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "px-2 py-1.5 rounded text-sm flex justify-between items-center",
                    item.disabled
                      ? "opacity-40 cursor-not-allowed bg-slate-50"
                      : "cursor-pointer bg-white hover:bg-slate-100 text-neutral-700 hover:text-neutral-900"
                  )}
                >
                  <span>{item.label}</span>
                  {value === item.value && <Icon name="check" fontSize={16} className="text-primary" />}
                </li>
              ))}
              {canCreate && (
                <li
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleCreate}
                  className="px-2 py-1.5 hover:bg-indigo-50 cursor-pointer rounded text-sm text-primary flex gap-2 items-center border-t mt-1"
                >
                  <Icon name="plus" fontSize={14} />
                  <span>Tạo "{inputValue.trim()}"</span>
                </li>
              )}
              {filtered.length === 0 && !canCreate && (
                <li className="px-2 py-4 flex flex-col items-center text-slate-500 text-sm">
                  <Icon name="hard-drive" fontSize={28} />
                  <span>Không có tùy chọn</span>
                </li>
              )}
            </ul>
          </m.div>
        )}
      </Portal>
    </div>
  );
};
