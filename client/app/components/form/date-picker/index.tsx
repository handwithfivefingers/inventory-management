import React, { useEffect, useRef, useState } from "react";
import { dayjs } from "~/libs/date";
import styles from "./styles.module.scss";
import { cn } from "~/libs/utils";
import { Portal } from "~/components/portal";
import { Icon } from "~/components/icon";
interface IDatePicker {
  onChange?: (value: any) => void;
  onClick?: (v: any) => void;
  name?: string;
  label?: string;
}
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const DatePicker = ({ onChange, name, onClick, label }: IDatePicker) => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [isFocus, setIsFocus] = useState<boolean>(false);
  const skeleton = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
      if (!dropdownRef.current?.contains(e.target)) {
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

  const handleBounce = () => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    dropdownRef.current?.style.setProperty("top", `${rect?.bottom}px`);
    dropdownRef.current?.style.setProperty("left", `${rect?.left}px`);
    dropdownRef.current?.style.setProperty("height", "auto");
    dropdownRef.current?.style.setProperty("z-index", "999");
    console.log("dropdownRef", dropdownRef.current);
  };

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

  const handleDateClick = (date: any) => {
    setSelectedDate(date);
    setIsFocus(false);
    onChange?.(date.format("YYYY-MM-DD"));
  };

  const handlePrevMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, "month"));
  };

  const handleNextMonth = () => {
    setCurrentMonth(currentMonth.add(1, "month"));
  };
  const generateDays = () => {
    const startOfMonth = currentMonth.startOf("month").day();
    const daysInMonth = currentMonth.daysInMonth();
    const endOfMonth = currentMonth.endOf("month").day();

    const prevMonth = currentMonth.subtract(1, "month");
    const nextMonth = currentMonth.add(1, "month");

    const prevMonthDays = prevMonth.daysInMonth();

    const days = [];

    console.log("prevMonthDays", prevMonthDays);

    for (let i = startOfMonth - 1; i >= 0; i--) {
      const date = prevMonth.date(prevMonthDays - i);
      days.push(
        <div
          key={`prev-${i}`}
          className={`w-8 h-8 text-center leading-8 rounded-full  text-sm ${
            date.isSame(selectedDate, "day")
              ? "bg-indigo-400 text-white shadow-lg"
              : date.day() === 0
              ? "text-red-700/40"
              : "text-black/40"
          }`}
        >
          {date.date()}
        </div>
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = currentMonth.date(day);
      days.push(
        <div
          key={day}
          className={`w-8 h-8 text-center leading-8 cursor-pointer rounded-full hover:bg-indigo-400 hover:text-white transition-colors text-sm ${
            date.isSame(selectedDate, "day")
              ? "bg-indigo-400 text-white shadow-lg"
              : date.day() === 0
              ? "text-red-700/90"
              : "text-black/80"
          }`}
          onClick={() => handleDateClick(date)}
        >
          {day}
        </div>
      );
    }

    for (let i = 1; i < 7 - endOfMonth; i++) {
      const date = nextMonth.date(i);
      days.push(
        <div
          key={`next-${i}`}
          className={`w-8 h-8 text-center leading-8 rounded-full text-sm ${
            date.isSame(selectedDate, "day")
              ? "bg-indigo-400 text-white shadow-lg"
              : date.day() === 0
              ? "text-red-700/40"
              : "text-black/40"
          }`}
        >
          {date.date()}
        </div>
      );
    }

    return days;
  };
  return (
    <div className="flex flex-col relative " ref={wrapperRef}>
      <label htmlFor={name} className="block text-sm/6 font-medium text-indigo-950 dark:text-slate-200">
        {label}
      </label>
      <div
        className={cn("relative rounded-md flex items-center ")}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
          setIsFocus(true);
          if (onClick) {
            onClick(e);
          }
        }}
      >
        <div className="pointer-events-none inset-y-0 left-0 flex items-center pl-1 z-[1]">
          <span className="text-indigo-950 sm:text-sm pl-1">
            <Icon name="calendar" className="text-indigo-900 w-6" />
          </span>
        </div>

        <input
          className="block w-full bg-transparent rounded-md border-0  text-gray-900  placeholder:text-gray-400  text-base outline-none  py-1.5 px-3 z-[1]"
          value={selectedDate.format("YYYY-MM-DD")}
        />

        <div
          className={cn(
            "absolute rounded-md left-0 top-0 w-full h-full ring-1 ring-gray-300  z-[0] shadow-sm bg-white",
            styles.outline
          )}
          ref={skeleton}
        />
      </div>
      <Portal>
        {isFocus && (
          <div
            className={`absolute top-full left-0 min-w-[220px] z-10 bg-white border rounded-lg translate-y-2 shadow-lg`}
            ref={dropdownRef}
          >
            <div className={"flex justify-between p-2 border-b  border-indigo-600"}>
              <button
                className="hover:text-indigo-600 bg-transparent border-0 outline-0 cursor-pointer text-base"
                onClick={handlePrevMonth}
              >
                ◀
              </button>
              <span className="hover:text-indigo-600 bg-transparent border-0 outline-0 cursor-pointer text-base text-lg">
                {currentMonth.format("MMMM YYYY")}
              </span>
              <button className="hover:text-indigo-600" onClick={handleNextMonth}>
                ▶
              </button>
            </div>

            <div className="flex justify-between px-2 pt-2 text-sm">
              {daysOfWeek.map((day, i: number) => (
                <div
                  key={day}
                  className={cn("p-1 text-slate-700", {
                    ["text-red-500"]: i == 0,
                  })}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className={`grid grid-cols-7 gap-1 p-2 pb-4`}>{generateDays()}</div>
          </div>
        )}
      </Portal>
    </div>
  );
};
