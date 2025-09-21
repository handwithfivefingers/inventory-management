import feather from "feather-icons";

export interface IIcon {
  name: string;
  className?: string;
  options?: Record<string, any>;
  [key: string]: any;
}
export const Icon = ({ name, options, className, fontSize = 20, ...rest }: IIcon) => {
  const icon = (feather as any).icons[name].toSvg({
    class: className,
    width: "100%",
    height: "100%",
    style: { strokeWidth: 1 },
    ...options,
  });
  return <div dangerouslySetInnerHTML={{ __html: icon }} {...rest} style={{ width: fontSize }} />;
};
