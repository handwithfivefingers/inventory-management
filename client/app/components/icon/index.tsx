import feather from "feather-icons";
import { sanitize } from "~/libs/utils";

export interface IIcon {
  name: string;
  className?: string;
  options?: Record<string, any>;
  [key: string]: any;
}
export const Icon = ({ name, options, className, ...rest }: IIcon) => {
  const icon = (feather as any).icons[name].toSvg({ class: className, ...options });
  return <div dangerouslySetInnerHTML={{ __html: icon }} {...rest} />;
};
