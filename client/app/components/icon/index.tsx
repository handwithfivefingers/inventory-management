import React from "react";
import feather from "feather-icons";

export interface IIcon {
  name: string;
  className?: string;
  options?: Record<string, any>;
}
export const Icon = ({ name, options, className }: IIcon) => {
  return <div dangerouslySetInnerHTML={{ __html: (feather as any).toSvg(name, { class: className, ...options }) }} />;
};
