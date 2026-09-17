import { cn } from "~/libs/utils";

interface Props {
  className?: string;
}
export const Divider = (props: Props) => {
  return <div className={cn("border-b border-primary my-2", props.className)} />;
};
