import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { ClientOnly } from "remix-utils/client-only";
import { BaseProps } from "~/types/common";
import { Portal } from "../portal";
import { Notification } from "./notification";
import {
  INotiParams,
  INotificationAPIContext,
  INotificationAction,
  INotificationContext,
  INotificationQueue,
} from "./notification.d";

let id = 1;
const initContext: INotificationContext = {
  queue: new Map(),
};
const reducer = (state: INotificationContext, action: INotificationAction) => {
  // id++;
  switch (action.type) {
    case "success":
      state.queue.set(action.payload.id, { ...action.payload, id: action.payload.id, variant: action.type });
      return { ...state };
    case "error":
      state.queue.set(action.payload.id, { ...action.payload, id: action.payload.id, variant: action.type });
      return { ...state };
    case "warning":
      state.queue.set(action.payload.id, { ...action.payload, id: action.payload.id, variant: action.type });
      return { ...state };
    case "info":
      state.queue.set(action.payload.id, { ...action.payload, id: action.payload.id, variant: action.type });
      return { ...state };
    case "remove":
      state.queue.delete(action.payload.pos);
      return { ...state };
    default:
      return { ...state };
  }
};

const NotificationContext = createContext(initContext);
const NotificationActionAPI = createContext({} as INotificationAPIContext);

interface IToastProps {
  success: (params: INotiParams) => void;
  danger: (params: INotiParams) => void;
  warning: (params: INotiParams) => void;
  info: (params: INotiParams) => void;
  remove: (id: number) => void;
}
export const toast: IToastProps = {
  success: (params: INotiParams) => {},
  danger: (params: INotiParams) => {},
  warning: (params: INotiParams) => {},
  info: (params: INotiParams) => {},
  remove: (id: number) => {},
};
export const NotificationProvider = ({ children }: BaseProps) => {
  const [state, dispatch] = useReducer(reducer, initContext);

  const api = useMemo(() => {
    return {
      success: ({ title, message }: INotiParams) => {
        id++; // console.log("count", id);
        dispatch({ type: "success", payload: { title, message, id } });
      },
      danger: ({ title, message }: INotiParams) => {
        id++;
        dispatch({ type: "error", payload: { title, message, id } });
      },
      warning: ({ title, message }: INotiParams) => {
        id++;
        dispatch({ type: "warning", payload: { title, message, id } });
      },
      info: ({ title, message }: INotiParams) => {
        id++;
        dispatch({ type: "info", payload: { title, message, id } });
      },
      remove: (id: number) => {
        dispatch({ type: "remove", payload: { pos: id } });
      },
    };
  }, []);

  useEffect(() => {
    toast.success = api.success;
    toast.warning = api.warning;
    toast.info = api.info;
    toast.danger = api.danger;
    toast.remove = api.remove;
  }, []);

  return (
    <NotificationActionAPI.Provider value={api as INotificationAPIContext}>
      <NotificationContext.Provider value={state}>
        {children}
        <ClientOnly>
          {() => {
            return (
              <Portal>
                <div className="notification">
                  {[...state.queue.values()]?.map((item: INotificationQueue) => {
                    return <Notification {...item} key={`toast_${item.id}`} id={item.id} />;
                  })}
                </div>
              </Portal>
            );
          }}
        </ClientOnly>
      </NotificationContext.Provider>
    </NotificationActionAPI.Provider>
  );
};

export const useNotification = () => {
  const apis = useContext(NotificationActionAPI);
  return apis;
};

export const useNotificationCtx = () => useContext(NotificationContext)?.queue;
