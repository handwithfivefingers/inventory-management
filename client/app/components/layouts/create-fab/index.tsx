import { Link } from "@remix-run/react";
import { ReactNode } from "react";
import { Icon } from "~/components/icon";
import { cn } from "~/libs/utils";

interface ICreateFab {
  /** Destination of the create flow (e.g. "add" or "./add"). */
  to: string;
  /** Accessible label (title / aria-label). */
  label: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Mobile-only floating action button, fixed bottom-right like a native app.
 * Sits above the BottomNav (bottom-16 + nav height) and above the More sheet.
 * Hidden from the `sm` breakpoint up, where the inline Create buttons show.
 */
export const CreateFab = ({ to, label, className, children }: ICreateFab) => {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className={cn(
        "sm:hidden fixed bottom-[4.5rem] right-3 z-30 flex h-12 w-12 items-center justify-center",
        "rounded-full bg-primary text-white shadow-lg shadow-primary/40 dark:bg-primary dark:text-white",
        "transition-transform active:scale-95",
        className,
      )}
    >
      {children || <Icon name="plus" fontSize={24} strokeWidth={2.5} />}
    </Link>
  );
};
