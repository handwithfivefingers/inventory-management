import React, { useEffect } from "react";
import { Portal } from "../portal";
import { BaseProps } from "~/types/common";
import styles from "./styles.module.scss";
import { TMButton } from "../tm-button";
import * as feather from "feather-icons";
import { Icon } from "../icon";

export interface ITMModal extends BaseProps {
  open?: boolean;
  close?: () => void;
  maskOnClose?: boolean;
  width?: number | string;
}

export const TMModal = ({ children, open = false, maskOnClose = true, close, width }: ITMModal) => {
  const onClose = () => {
    close?.();
  };

  const onMaskClicked = () => {
    console.log("close");
    if (maskOnClose) {
      return close?.();
    }
  };
  return (
    open && (
      <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            className="flex flex-col gap-2 bg-white rounded-md min-w-60 shadow-md z-10 relative"
            style={{
              width: width,
            }}
          >
            <div className="flex border-indigo-600 border-b-2  px-4 py-2 items-center">
              <h2 className="text-lg/4">Title</h2>
              <div className="ml-auto cursor-pointer hover:bg-neutral-400/20 p-1 rounded-md" onClick={onClose}>
                <Icon name="x" />
              </div>
            </div>
            <div className="p-4 flex">{children}</div>
          </div>
          <div className="absolute left-0 top-0 w-full h-full" onClick={onMaskClicked}></div>
        </div>
      </Portal>
    )
  );
};
