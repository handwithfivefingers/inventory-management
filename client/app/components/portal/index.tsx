import { createPortal } from "react-dom";
import { BaseProps } from "~/types/common";

export const Portal = (props: BaseProps) => {
  return createPortal(props.children, document.body);
};
