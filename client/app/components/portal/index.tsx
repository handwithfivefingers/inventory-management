import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BaseProps } from "~/types/common";

export const Portal = ({ children }: BaseProps) => {
  const [load, setLoad] = useState(false);
  useEffect(() => {
    setLoad(true);
  }, []);
  const p = useMemo(
    () => (load && children && createPortal(children as any, document?.body)) || <></>,
    [children, load]
  );
  return p;
};
