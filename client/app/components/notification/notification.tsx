import React, {
  createContext,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Portal } from "../portal";
import { cn } from "~/libs/utils";
import styles from "./styles.module.scss";
import { Icon } from "../icon";
import { INotification, INotificationPlacement, INotificationVariant } from "./notification.d";
import { toast } from ".";

const placements: Record<INotificationPlacement, string> = {
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-2 right-2",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
};
const variants: Record<INotificationVariant, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  warning: "bg-yellow-500",
  info: "bg-indigo-600",
};

export type NotificationAction = {};

export const Notification = (props: INotification) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: any;
    let timer2: any;

    timer2 = setTimeout(() => {
      divRef.current?.classList.add("animate__fadeOutUp");
    }, 3500);
    timer = setTimeout(() => {
      toast.remove(props.id);
    }, 4000);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    if (props.id > 0) {
      reAllocatePosition();
    }
  }, [props.id]);

  const reAllocatePosition = () => {
    const previousTarget = document.querySelector("#toast_" + (Number(props.id) - 1));
    if (previousTarget) {
      const bounce = previousTarget.getBoundingClientRect();
      if (divRef.current) {
        divRef.current.style.top = `${bounce.bottom + 10}px`;
      }
    }
  };

  return (
    <div
      className={cn(
        "fixed shadow-xl animate__animated animate__faster animate__fadeInDown",
        "fixed shadow-xl bg-white dark:bg-slate-800/80",
        placements[props.placement || "top-right"],
        styles.notification
      )}
      id={`toast_${props.id}`}
      ref={divRef}
    >
      <div className={styles.notificationInner}>
        <div className={cn("absolute h-full w-1 top-0 left-0 z-10 rounded-md", variants[props.variant || "info"])} />
        <div className="flex gap-2 justify-between">
          <div className="text-base/7 font-medium truncate">{props?.title}</div>
          <Icon
            onClick={() => toast.remove(props.id)}
            name="x"
            className="text-neutral-500 hover:text-neutral-900 rounded-md transition-all flex-1 cursor-pointer absolute right-0 w-5 h-5"
          />
        </div>
        <div className="text-sm">{props?.message} </div>
      </div>
    </div>
  );
};
