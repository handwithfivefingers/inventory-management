import React, { forwardRef } from "react";
import { useFormState } from "react-hook-form";
import { cn } from "~/libs/utils";
import styles from "./styles.module.scss";

interface IFieldError {
  [key: string]: {
    message: string;
  };
}

interface ISwitchInput {
  value?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  [key: string]: any;
}

/**
 * On/off switch control, consistent with the app's form styling (slate track
 * in light mode, slate-600 in dark, primary when on).
 *
 * Same contract as the old CheckboxInput (which was visually a switch):
 * accepts `value`/`checked` for the state, `onChange` as a real change event
 * (`e.target.checked`), forwards extra props, and works inside FormControl.
 */
export const SwitchInput = forwardRef<HTMLInputElement, ISwitchInput>(
  (
    {
      label,
      name,
      className,
      wrapperClassName,
      style,
      onChange,
      onClick,
      value = false,
      checked,
      disabled = false,
      children,
      required,
      ...rest
    },
    ref,
  ) => {
    const { errors } = name ? (useFormState() as { errors: IFieldError }) : { errors: undefined };

    const isChecked = checked ?? !!value;

    return (
      <div className={cn(styles.inputWrapper, styles.wrapperClassName)}>
        <InputLabel name={name} label={label} required={required} />

        <div className={cn("inline-flex", wrapperClassName)} onClick={onClick}>
          <label
            className={cn(
              "inline-flex items-center gap-2 cursor-pointer select-none",
              disabled ? "cursor-not-allowed opacity-50" : "",
              className,
            )}
            style={style}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
          >
            <input
              type="checkbox"
              className="hidden"
              checked={isChecked}
              name={name}
              onChange={onChange}
              ref={ref}
              disabled={disabled}
              {...rest}
            />
            <span
              aria-hidden
              className={cn(
                "w-9 h-5 shrink-0 rounded-full relative transition-colors",
                "bg-slate-200 dark:bg-slate-600",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400/40",
                {
                  ["bg-primary"]: isChecked,
                },
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                  isChecked && "translate-x-4",
                )}
              />
            </span>
            {children ? <span className="text-sm text-slate-700 dark:text-slate-300">{children}</span> : null}
          </label>
          {name && errors?.[name]?.message && <p className="text-red-500 p-2">{errors?.[name]?.message as string}</p>}
        </div>
      </div>
    );
  },
);

const InputLabel = ({ label, name, required }: { label?: string; name?: string; required?: boolean }) => {
  if (!label) return;
  return (
    <label htmlFor={name} className="block text-sm/6 font-medium text-gray-900 dark:text-slate-200">
      {label}
      {required && <span className="text-rose-600"> *</span>}
    </label>
  );
};
