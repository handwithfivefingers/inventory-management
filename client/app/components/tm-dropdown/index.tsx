import React, { useEffect, useRef, useState } from "react";
import styles from "./styles.module.scss";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";
import { ITMButton, TMButton } from "../tm-button";
import { Portal } from "../portal";

interface IDropdownItem {
  label: React.ReactNode;
  onClick: (item: IDropdownItem) => void;
}
interface ITMDropdown extends BaseProps, ITMButton {
  items: IDropdownItem[];
  placement?: "left" | "right";
}
export const TMDropdown = ({ items, children, placement = "right", variant }: ITMDropdown) => {
  const [show, setShow] = useState(false);
  const dropdown = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: any) => {
      if (!dropdown.current?.contains(e.target)) {
        // setIsFocus(false);
        setShow(false);
        return;
      }
    };
    if (show) {
      document.addEventListener("click", handler, false);
    }
    return () => document.removeEventListener("click", handler, false);
  }, [show]);
  useEffect(() => {
    if (show) {
      handleBounce();
    } else {
      dropdown.current?.style.setProperty("height", "0");
      dropdown.current?.style.setProperty("z-index", "-1");
    }
  }, [show]);
  const handleBounce = () => {
    const rect = wrapper.current?.getBoundingClientRect();
    if (placement === "left") {
      dropdown.current?.style.setProperty("left", `${rect?.left}px`);
    } else {
      dropdown.current?.style.setProperty("left", `${rect?.right}px`);
      dropdown.current?.classList.add("!-translate-x-[100%]");
    }
    dropdown.current?.style.setProperty("top", `${rect?.bottom}px`);
    dropdown.current?.style.setProperty("height", "auto");
    dropdown.current?.style.setProperty("z-index", "999");
    console.log("dropdown", dropdown.current);
  };

  const handleToggle = () => {
    setShow(!show);
  };
  return (
    <div className={styles.wrapper} ref={wrapper}>
      <TMButton variant={variant} onClick={handleToggle} size="xs" className="h-full">
        {children}
      </TMButton>
      <Portal>
        {show && (
          <div
            className={cn("animate__animated animate__faster animate__fadeInUp", styles.dropdown)}
            ref={dropdown}
            style={
              {
                "--animate-duration": "0.3s",
              } as React.CSSProperties
            }
          >
            <ul className="max-h-[400px] overflow-y-auto flex gap-0.5 flex-col p-0.5">
              {items?.map(({ onClick, label }) => {
                return (
                  <li
                    className={cn(
                      " px-2  hover:bg-indigo-50 cursor-pointer rounded-sm  bg-white transition-all text-neutral-700/90 hover:text-neutral-900 py-1.5 "
                    )}
                    onClick={onClick as any}
                  >
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Portal>
    </div>
  );
};
