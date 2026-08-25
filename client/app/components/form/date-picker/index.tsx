import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dayjs } from "dayjs";
import { dayjs } from "~/libs/date";
import { cn } from "~/libs/utils";
import { Portal } from "~/components/portal";
import { Icon } from "~/components/icon";

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
    const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

    const wrapperRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const syncPanelPosition = useCallback(() => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPanelPos({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8)),
      });
    }, []);

    const openPanel = () => {
      if (disabled) return;
      setViewMonth((toDate(selected) ?? dayjs()).startOf("month"));
      syncPanelPosition();
      setOpen(true);
    };

    // Close on outside click / Escape; keep the panel glued to the trigger on scroll.
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
      window.addEventListener("resize", syncPanelPosition);
      window.addEventListener("scroll", syncPanelPosition, true);
      return () => {
        document.removeEventListener("mousedown", onMouseDown);
        document.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("resize", syncPanelPosition);
        window.removeEventListener("scroll", syncPanelPosition, true);
      };
    }, [open, syncPanelPosition]);

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
          className={cn("relative rounded-md flex items-center min-h-[34px] cursor-pointer select-none", {
            ["opacity-60 pointer-events-none"]: disabled,
          })}
          ref={wrapperRef}
          onClick={() => (open ? setOpen(false) : openPanel())}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              open ? setOpen(false) : openPanel();
            }
          }}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 z-[1]">
            <span className="text-indigo-900 dark:text-slate-200">
              <Icon name="calendar" fontSize={16} />
            </span>
          </div>
          <span
            className={cn(
              "block w-full bg-transparent rounded-md border-0 outline-none py-1.5 pl-8 pr-7 text-sm truncate z-1",
              selected ? "text-gray-900 dark:text-slate-100" : "text-gray-400",
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
          <div
            className={cn(
              "absolute rounded-sm left-0 top-0 w-full h-full ring-1 ring-gray-300 -z-[0] bg-white dark:bg-slate-800",
              {
                ["ring-2 ring-inset !ring-red-600"]: !!error,
                ["ring-2 ring-inset ring-indigo-600"]: open,
              },
            )}
          />
        </div>

        <Portal>
          {open && (
            <div
              role="dialog"
              aria-label={label || "date-picker"}
              className="fixed z-[999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg p-2 select-none"
              style={{ top: panelPos.top, left: panelPos.left, width: PANEL_WIDTH }}
              ref={panelRef}
            >
              <div className="flex items-center justify-between px-1 pb-2 mb-1 border-b border-indigo-600/40">
                <button
                  type="button"
                  aria-label="Previous month"
                  className="p-1 rounded hover:bg-indigo-50 hover:text-indigo-600 bg-transparent border-0 cursor-pointer text-slate-600 dark:text-slate-200"
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
                  className="p-1 rounded hover:bg-indigo-50 hover:text-indigo-600 bg-transparent border-0 cursor-pointer text-slate-600 dark:text-slate-200"
                  onClick={() => setViewMonth(viewMonth.add(1, "month"))}
                >
                  <Icon name="chevron-right" fontSize={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-y-1 text-center text-sm text-slate-500 pb-1">
                {WEEKDAYS.map((day, i) => (
                  <span key={day} className={cn({ ["text-rose-500"]: i === 0 })}>
                    {day}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
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
                          ["bg-indigo-600 !text-white shadow"]: isSelected,
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
            </div>
          )}
        </Portal>
        {error && <span className="text-sm text-rose-600">{error}</span>}
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
