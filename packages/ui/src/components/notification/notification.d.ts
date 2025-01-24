import { ReactNode } from "react";
export interface INotiParams {
  title?: string;
  message?: string;
}

export interface INotificationQueue extends INotiParams {
  id: number;
  variant?: INotificationVariant;
}
export interface INotificationContext {
  queue: Map<INotificationQueue>;
}
type INotificationAction = SUCCESS | ERROR | WARNING | INFO | REMOVE;

export interface SUCCESS {
  type: "success";
  payload: INotiParams & { id: number };
}
export interface ERROR {
  type: "error";
  payload: INotiParams & { id: number };
}
export interface WARNING {
  type: "warning";
  payload: INotiParams & { id: number };
}
export interface INFO {
  type: "info";
  payload: INotiParams & { id: number };
}
export interface REMOVE {
  type: "remove";
  payload: { pos: number };
}
export type INotificationPlacement = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

export type INotificationVariant = "success" | "error" | "warning" | "info";

export interface INotification {
  placement?: INotificationPlacement;
  variant?: INotificationVariant;
  title?: string | ReactNode;
  message?: string | ReactNode;
  id: number;
}

interface INotificationAPIContext {
  success: (data?: INotiParams) => void;
  error: (data?: INotiParams) => void;
  warning: (data?: INotiParams) => void;
  info: (data?: INotiParams) => void;
  remove: (pos?: number) => void;
}
