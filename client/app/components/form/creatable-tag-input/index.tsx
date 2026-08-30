import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "~/components/icon";
import { Portal } from "~/components/portal";
import { DROPDOWN_PANEL_CLASS, useDropdownPosition } from "~/hooks";
import { cn } from "~/libs/utils";

export interface Option {
  label: string;
  value: string;
}

interface Props {
  label?: string;
  placeholder?: string;
  value: Option[];
  options: Option[]; // suggestions (global reusable)
  onChange: (next: Option[]) => void;
  inputSize?: "xs" | "sm" | "md";
}

const SizeClass = {
  xs: "py-1 px-1.5 text-xs",
  sm: "py-1 px-2 text-sm",
  md: "py-2 px-3 text-sm",
};

export const CreatableTagInput: React.FC<Props> = ({
  label,
  placeholder = "Nhập và nhấn Enter",
  value = [],
  options = [],
  onChange,
  inputSize,
}) => {
  const wrapper = useRef<HTMLDivElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocus, setIsFocus] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useDropdownPosition(isFocus, wrapper, dropdown);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!wrapper.current?.contains(target) && !dropdown.current?.contains(target)) setIsFocus(false);
    };
    if (isFocus) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isFocus]);

  const selectedValues = useMemo(() => new Set(value.map((v) => v.value.toLowerCase())), [value]);

  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    return options.filter(
      (o) =>
        !selectedValues.has(o.value.toLowerCase()) &&
        (!q || o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)),
    );
  }, [options, inputValue, selectedValues]);

  const canCreate = useMemo(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return false;
    if (selectedValues.has(trimmed.toLowerCase())) return false;
    if (options.some((o) => o.value.toLowerCase() === trimmed.toLowerCase())) return false;
    return true;
  }, [inputValue, selectedValues, options]);

  const addOption = (opt: Option) => {
    if (selectedValues.has(opt.value.toLowerCase())) return;
    onChange([...value, opt]);
    setInputValue("");
    inputRef.current?.focus();
  };

  const createFromInput = () => {
    const raw = inputValue.trim();
    if (!raw) return;
    // allow comma-separated paste
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const toAdd: Option[] = [];
    for (const p of parts) {
      if (!selectedValues.has(p.toLowerCase()) && !toAdd.some((x) => x.value.toLowerCase() === p.toLowerCase())) {
        if (
          !options.some((o) => o.value.toLowerCase() === p.toLowerCase() && selectedValues.has(o.value.toLowerCase()))
        ) {
          toAdd.push({ label: p, value: p });
        }
      }
    }
    if (toAdd.length === 0) return;
    // deduplicate against existing
    const existingLower = new Set(value.map((v) => v.value.toLowerCase()));
    const filteredAdd = toAdd.filter((o) => !existingLower.has(o.value.toLowerCase()));
    if (filteredAdd.length) onChange([...value, ...filteredAdd]);
    setInputValue("");
  };

  const removeAt = (val: string) => {
    onChange(value.filter((v) => v.value !== val));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (canCreate) createFromInput();
      else if (filtered.length === 1) addOption(filtered[0]);
      else if (filtered.length > 0 && inputValue.trim()) {
        const exact = filtered.find((o) => o.label.toLowerCase() === inputValue.trim().toLowerCase());
        if (exact) addOption(exact);
        else createFromInput();
      }
    } else if (e.key === ",") {
      e.preventDefault();
      createFromInput();
    } else if (e.key === "Backspace" && !inputValue && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  // if (e.key === "Enter") {
  //   e.preventDefault();
  //   if (canCreate) createFromInput();
  //   else if (filtered.length === 1) addOption(filtered[0]);
  //   else if (filtered.length > 0 && inputValue.trim()) {
  //     // if exact match in filtered, select it
  //     const exact = filtered.find((o) => o.label.toLowerCase() === inputValue.trim().toLowerCase());
  //     if (exact) addOption(exact);
  //     else createFromInput();
  //   }
  // } else if (e.key === ",") {
  //   e.preventDefault();
  //   createFromInput();
  // } else if (e.key === "Backspace" && !inputValue && value.length) {
  //   onChange(value.slice(0, -1));
  // }
  // };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (text.includes(",")) {
      e.preventDefault();
      const parts = text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const existingLower = new Set(value.map((v) => v.value.toLowerCase()));
      const toAdd = parts.filter((p) => !existingLower.has(p.toLowerCase())).map((p) => ({ label: p, value: p }));
      if (toAdd.length) onChange([...value, ...toAdd]);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="block text-sm/6 font-medium text-gray-900">{label}</label>}
      <div
        ref={wrapper}
        onClick={() => {
          setIsFocus(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          "relative flex flex-wrap gap-1 items-center rounded-md bg-slate-50 border border-slate-300 px-2 py-1 cursor-text transition-all",
          "ring-2 ring-transparent focus-within:ring-indigo-400/30",
          SizeClass[inputSize || "sm"],
        )}
      >
        {value.map((opt) => (
          <span
            key={opt.value}
            className="inline-flex items-center gap-1 bg-indigo-50 text-slate-700 rounded px-1.5 py-0.5 text-xs"
          >
            <span>{opt.label}</span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => removeAt(opt.value)}
              className="text-primary hover:text-indigo-800"
            >
              <Icon name="x" fontSize={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocus(true)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm placeholder:text-gray-400"
        />
      </div>

      <Portal>
        {isFocus && (filtered.length > 0 || canCreate) && (
          <div
            ref={dropdown}
            className={cn(DROPDOWN_PANEL_CLASS, "rounded-md")}
            style={{ maxHeight: 240, overflowY: "auto" }}
          >
            <ul className="p-1 flex flex-col gap-1 max-h-[240px] overflow-y-auto">
              {filtered.map((o) => (
                <li
                  key={o.value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addOption(o)}
                  className="px-2 py-1.5 hover:bg-slate-100 cursor-pointer rounded text-sm text-neutral-700 flex justify-between items-center"
                >
                  <span>{o.label}</span>
                  <Icon name="plus" fontSize={12} className="text-slate-400" />
                </li>
              ))}
              {canCreate && (
                <li
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={createFromInput}
                  className="px-2 py-1.5 hover:bg-indigo-50 cursor-pointer rounded text-sm text-primary flex gap-2 items-center border-t border-slate-100 mt-1"
                >
                  <Icon name="plus" fontSize={14} />
                  <span>Tạo "{inputValue.trim()}"</span>
                </li>
              )}
              {filtered.length === 0 && !canCreate && (
                <li className="px-2 py-2 text-xs text-slate-400 text-center">Không có gợi ý</li>
              )}
            </ul>
          </div>
        )}
      </Portal>
    </div>
  );
};
