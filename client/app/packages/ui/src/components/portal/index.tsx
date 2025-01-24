import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BaseProps } from "~/types/common";

interface IPortal {}
export const Portal = (props: BaseProps) => {
  const [load, setLoad] = useState(false);
  useEffect(() => {
    setLoad(true);
  }, []);
  const portal = useMemo(() => load && createPortal(props.children, document?.body), [props.children, load]);
  return portal;
};
