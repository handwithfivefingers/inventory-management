import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dayjs } from "dayjs";
import { dayjs } from "~/libs/date";
import { cn } from "~/libs/utils";
import { Portal } from "~/components/portal";
import { Icon } from "~/components/icon";
import { DROPDOWN_PANEL_CLASS, useDropdownPosition } from "~/hooks";
import { m } from "motion/react";
/** Canonical value format exchanged with forms / APIs. */
export const DATE_VALUE_FORMAT = "YYYY-MM-DD";
const DISPLAY_FORMAT = "DD/MM/YYYY";
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const PANEL_WIDTH = 264;

export interface IDatePicker {
  name?: string;
  /** Selected date in "YYYY-MM-DD" format. Omit to use as uncontrolled with `defaultValue`. */
  value?: string | null;
  defaultValue?: string | null;
  /** Receives the newly picked date in "YYYY-MM-DD" format ("" when cleared). */
  onChange?: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Show a small "x" to clear the current value. */
  clearable?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
}

const toDate = (value?: string | null) => {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d : null;
};

/**
 * Dayjs-based calendar picker. Drop-in replacement for `<input type="date" />`,
 * works standalone, with native forms (renders a hidden input when `name` is set)
 * and with react-hook-form via `FormControl`.
 */
export const DatePicker = forwardRef<HTMLDivElement, IDatePicker>(
  (
    {
      name,
      value,
      defaultValue,
      onChange,
      onBlur,
      label,
      placeholder,
      disabled,
      clearable,
      required,
      error,
      className,
    },
    ref,
  ) => {
    const [innerValue, setInnerValue] = useState(defaultValue ?? "");
    const isControlled = value !== undefined;
    const selected = (isControlled ? value : innerValue) ?? "";
    const [open, setOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(() => (toDate(selected) ?? dayjs()).startOf("month"));
    const wrapperRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Keep the calendar panel glued to the trigger on scroll / resize.
    useDropdownPosition(open, wrapperRef, panelRef);

    const openPanel = () => {
      if (disabled) return;
      setViewMonth((toDate(selected) ?? dayjs()).startOf("month"));
      setOpen(true);
    };

    // Close on outside click / Escape.
    useEffect(() => {
      if (!open) return;
      const onMouseDown = (e: MouseEvent) => {
        if (!wrapperRef.current?.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("mousedown", onMouseDown);
      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.removeEventListener("mousedown", onMouseDown);
        document.removeEventListener("keydown", onKeyDown);
      };
    }, [open]);

    const commit = (date: Dayjs | null) => {
      const next = date ? date.format(DATE_VALUE_FORMAT) : "";
      if (!isControlled) setInnerValue(next);
      setOpen(false);
      onChange?.(next);
      onBlur?.();
    };

    /** 42 leading/trailing-aware cells covering the visible month grid. */
    const cells = useMemo(() => {
      const monthStart = viewMonth.startOf("month");
      const gridStart = monthStart.subtract(monthStart.day(), "day");
      return Array.from({ length: 42 }, (_, i) => gridStart.add(i, "day"));
    }, [viewMonth]);

    const selectedDate = toDate(selected);
    const today = dayjs().startOf("day");

    const onKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open ? setOpen(false) : openPanel();
      }
    };
    return (
      <div className={cn("flex flex-col relative w-full", className)} ref={ref}>
        {label && (
          <label htmlFor={name} className="block text-sm/6 font-medium text-gray-900 dark:text-slate-200">
            {label}
            {required && <span className="text-rose-600"> *</span>}
          </label>
        )}
        {name && <input type="hidden" name={name} value={selected} />}
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={!!error}
          className={cn(
            "relative rounded-md flex items-center cursor-pointer select-none bg-slate-50 dark:bg-slate-700",
            "ring-2 ring-transparent border border-slate-300 transition-all",
            {
              ["opacity-60 pointer-events-none"]: disabled,
              ["ring-red-600"]: !!error,
              ["ring-indigo-400/30"]: open,
            },
          )}
          ref={wrapperRef}
          onClick={() => (open ? setOpen(false) : openPanel())}
          onKeyDown={onKeyDown}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 z-[1]">
            <span className="text-slate-500 dark:text-slate-300">
              <Icon name="calendar" fontSize={16} />
            </span>
          </div>
          <span
            className={cn(
              "block w-full bg-transparent rounded-md border-0 outline-none py-1 pl-8 pr-7 text-sm truncate z-1 text-slate-700 dark:text-slate-300",
            )}
          >
            {selectedDate ? selectedDate.format(DISPLAY_FORMAT) : placeholder || DISPLAY_FORMAT.toLowerCase()}
          </span>

          {clearable && !!selected && !disabled && (
            <button
              type="button"
              aria-label="Clear"
              className="absolute right-1.5 z-[1] p-0.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-slate-100 transition-colors bg-transparent border-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                commit(null);
              }}
            >
              <Icon name="x" fontSize={14} />
            </button>
          )}
        </div>

        <Portal>
          {open && (
            <m.div
              role="dialog"
              aria-label={label || "date-picker"}
              className={cn(DROPDOWN_PANEL_CLASS, "[p-2 select-none max-w-[300px]")}
              style={{ width: PANEL_WIDTH }}
              ref={panelRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between px-1 pb-2 py-2 border-b border-primary/40">
                <button
                  type="button"
                  aria-label="Previous month"
                  className="p-1 rounded hover:bg-indigo-50 hover:text-primary bg-transparent border-0 cursor-pointer text-slate-600 dark:text-slate-200"
                  onClick={() => setViewMonth(viewMonth.subtract(1, "month"))}
                >
                  <Icon name="chevron-left" fontSize={16} />
                </button>
                <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  {viewMonth.format("MMMM YYYY")}
                </span>
                <button
                  type="button"
                  aria-label="Next month"
                  className="p-1 rounded hover:bg-indigo-50 hover:text-primary bg-transparent border-0 cursor-pointer text-slate-600 dark:text-slate-200"
                  onClick={() => setViewMonth(viewMonth.add(1, "month"))}
                >
                  <Icon name="chevron-right" fontSize={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-y-1 py-2 text-center text-sm text-slate-500">
                {WEEKDAYS.map((day, i) => (
                  <span key={day} className={cn({ ["text-rose-500"]: i === 0 })}>
                    {day}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1 pb-2">
                {cells.map((date) => {
                  const isSelected = !!selectedDate && date.isSame(selectedDate, "day");
                  const isToday = date.isSame(today, "day");
                  const isCurrentMonth = date.isSame(viewMonth, "month");
                  return (
                    <button
                      type="button"
                      key={date.format(DATE_VALUE_FORMAT)}
                      className={cn(
                        "w-8 h-8 mx-auto text-center leading-8 rounded-full text-sm bg-transparent border-0 cursor-pointer transition-colors",
                        // isCurrentMonth ? "text-black/80 dark:text-slate-100" : "!text-black/30 dark:!text-slate-500",
                        `opacity-50 text-black/80 dark:text-slate-100`,
                        {
                          [` opacity-100`]: isCurrentMonth,
                          ["text-rose-600/80"]: date.day() === 0 && !isSelected,
                          ["hover:bg-indigo-400 hover:text-white"]: !isSelected,
                          ["bg-primary !text-white shadow"]: isSelected,
                          ["font-semibold ring-1 ring-inset ring-indigo-400"]: isToday && !isSelected,
                        },
                      )}
                      onClick={() => commit(date)}
                    >
                      {date.date()}
                    </button>
                  );
                })}
              </div>
            </m.div>
          )}
        </Portal>
        {/* {error && <span className="text-sm text-rose-600">{error}</span>} */}
      </div>
    );
  },
);

DatePicker.displayName = "DatePicker";

export interface IDateRangePicker {
  from?: string | null;
  to?: string | null;
  /** Receives `{ from, to }` in "YYYY-MM-DD" format. */
  onChange?: (range: { from: string; to: string }) => void;
  fromLabel?: string;
  toLabel?: string;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  clearable?: boolean;
  className?: string;
}

/** Two linked `DatePicker`s keeping `from <= to`. */
export const DateRangePicker = ({
  from,
  to,
  onChange,
  fromLabel,
  toLabel,
  fromPlaceholder,
  toPlaceholder,
  clearable,
  className,
}: IDateRangePicker) => {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <DatePicker
        label={fromLabel}
        placeholder={fromPlaceholder}
        value={from}
        clearable={clearable}
        className="min-w-[140px]"
        onChange={(v) => onChange?.({ from: v, to: v && to && v > to ? v : to ?? "" })}
      />
      <DatePicker
        label={toLabel}
        placeholder={toPlaceholder}
        value={to}
        clearable={clearable}
        className="min-w-[140px]"
        onChange={(v) => onChange?.({ from: v && from && v < from ? v : from ?? "", to: v })}
      />
    </div>
  );
};

// You are operating a 6-process recursive development and testing pipeline. Your task is to process this <input>:

// Execute the 6 processes sequentially. Label each step clearly:

// === PHASE 1: SOLVING THE INPUT ===
// - PROCESS 1 (Decomposition): Analyze the input. List all implicit constraints, edge cases, and structural requirements.
// - PROCESS 2 (Drafting): Write the initial code or solution addressing all points from Process 1.
// - PROCESS 3 (Optimization): Refactor the code from Process 2 for optimal performance, memory efficiency, and readability.

// === PHASE 2: TESTING THE BUILD ===
// - PROCESS 4 (Functional Testing): Create a test suite to verify the code against standard inputs and mathematical/logical constraints. State the results.
// - PROCESS 5 (Stress Testing): Create tests for extreme inputs (e.g., empty values, overflow thresholds, type mismatches). State the results.

// === PHASE 3: AUDITING THE SYSTEM ===
// - PROCESS 6 (The Auditor): Critically evaluate Process 4 and Process 5. Did the tests cover 100% of the logic? Were the test assertions rigorous enough? If any flaws are found in the tests or the original code, force a rewrite here.

// OUTPUT: Provide the final, triple-verified solution and the passing test logs.
