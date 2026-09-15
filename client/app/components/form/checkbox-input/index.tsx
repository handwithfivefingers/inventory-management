import { forwardRef, useRef } from "react";
import { useFormState } from "react-hook-form";
import { Icon } from "~/components/icon";
import { cn } from "~/libs/utils";

interface IFieldError {
  [key: string]: {
    message: string;
  };
}

interface ICheckboxInput {
  value?: boolean;
  disabled?: boolean;
  [key: string]: any;
}

/**
 * Square check control, consistent with TextInput/SelectInput styling.
 *
 * The native input stays in the DOM (accessible + form-compatible) and the
 * styled box mirrors its state. Works both standalone and inside FormControl:
 * it accepts `value`/`checked` for the state and `onChange` as a real change
 * event (`e.target.checked`). Extra props like `onClick` are attached to the
 * outer wrapper so callers can, e.g., stop row-click propagation in tables.
 */
export const CheckboxInput = forwardRef<HTMLInputElement, ICheckboxInput>(
  (
    {
      label,
      name,
      className,
      wrapperClassName,
      style,
      onChange,
      onClick,
      inputClassName,
      suffix,
      value = false,
      checked,
      disabled = false,
      ...rest
    },
    ref,
  ) => {
    const { errors } = name ? (useFormState() as { errors: IFieldError }) : { errors: undefined };
    const inputRef = useRef<HTMLInputElement | null>(null);

    const isChecked = checked ?? !!value;

    return (
      <div className={cn("inline-flex", wrapperClassName)} onClick={onClick}>
        <label
          className={cn(
            "inline-flex items-center gap-2 cursor-pointer select-none",
            disabled ? "cursor-not-allowed opacity-50" : "",
            className,
          )}
          style={style}
        >
          <input
            type="checkbox"
            className="peer sr-only"
            checked={isChecked}
            name={name}
            onChange={onChange}
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) (ref as any).current = node;
            }}
            disabled={disabled}
            {...rest}
          />
          <span
            aria-hidden
            className={cn(
              "w-4.5 h-4.5 shrink-0 rounded border flex items-center justify-center transition-colors",
              "bg-white dark:bg-slate-700",
              "border-slate-300 dark:border-slate-500",
              "peer-checked:bg-primary peer-checked:border-primary",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400/40",
              inputClassName,
            )}
          >
            <Icon
              name="check"
              fontSize={12}
              strokeWidth={3}
              className={cn("text-white transition-opacity", isChecked ? "opacity-100" : "opacity-0")}
            />
          </span>
          {label ? (
            <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
          ) : null}
          {suffix}
        </label>
        {name && errors?.[name]?.message && <p className="text-red-500 p-2">{errors?.[name]?.message as string}</p>}
      </div>
    );
  },
);
