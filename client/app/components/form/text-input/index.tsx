import React, { HTMLInputTypeAttribute, forwardRef, useRef } from "react";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";
import styles from "./styles.module.scss";
import { useFormContext, useFormState } from "react-hook-form";
export interface ITextInput extends BaseProps, React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  name?: string;
  prefix?: string | React.ReactNode | any;
  suffix?: string | React.ReactNode | any;
  placeholder?: string;
  value?: string;
  type?: string | undefined | any;
  wrapperClassName?: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
  inputSize?: "xs" | "sm" | "md";
  /** Show a red asterisk next to the label for required fields */
  required?: boolean;
}

interface IFieldError {
  [key: string]: {
    message: string;
  };
}

const SizeClass = {
  xs: "py-1 px-1.5 text-xs",
  sm: "py-1 px-2 text-sm",
  md: "py-2 px-4 text-sm",
};
export const TextInput = forwardRef<HTMLInputElement, ITextInput>(
  (
    {
      label,
      name,
      prefix,
      placeholder,
      className,
      wrapperClassName,
      style,
      onChange,
      suffix,
      error,
      multiline,
      rows,
      inputSize,
      required,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const prefixRef = useRef<HTMLSpanElement>(null);
    const { errors } = name ? (useFormState() as { errors: IFieldError }) : { errors: undefined };
    const { clearErrors } = name ? useFormContext() : { clearErrors: (arg: string) => {} };
    const hasError = error || (name && errors?.[name]?.message);
    if (multiline) {
      return (
        <div className={cn(styles.inputWrapper, styles.wrapperClassName)}>
          <InputLabel name={name} label={label} required={required} />
          <div className={cn("relative rounded-md flex items-center w-full bg-slate-50")}>
            <textarea
              name={name}
              id={name}
              className={cn(
                "block w-full bg-transparent rounded-md border-0 text-xs",
                "ring-2 ring-transparent transition-all focus:ring-indigo-400/30 border border-slate-300 outline-none",
                "text-slate-700  placeholder:text-gray-400",
                SizeClass[inputSize || "sm"],
                styles.input,
                className,
                {
                  ["focus:!ring-red-600"]: hasError,
                },
              )}
              placeholder={placeholder}
              rows={rows || 3}
              {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
              ref={ref as any}
              onChange={(e) => {
                clearErrors(name as string);
                onChange?.(e as any);
              }}
              style={style}
            />
          </div>
        </div>
      );
    }
    return (
      <div className={cn(styles.inputWrapper)}>
        <InputLabel name={name} label={label} required={required} />
        <div className={cn("relative rounded-md flex items-center w-full bg-slate-50 dark:bg-slate-700")}>
          <InputPrefix prefix={prefix} prefixRef={prefixRef} />
          <input
            name={name}
            id={name}
            className={cn(
              "block w-full bg-transparent rounded-md ",
              "ring-2 ring-transparent transition-all focus:ring-indigo-400/30 border border-slate-300 outline-none",
              "text-slate-700 dark:text-slate-300  placeholder:text-gray-400",
              SizeClass[inputSize || "sm"],
              prefix && "pl-8",
              suffix && "pr-8",
              styles.input,
              className,
              {
                ["focus:!ring-red-600"]: name && errors?.[name]?.message,
              },
            )}
            placeholder={placeholder}
            {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
            ref={ref}
            onChange={(e) => {
              clearErrors(name as string);
              onChange?.(e);
            }}
            style={style}
            disabled={disabled}
          />
          {suffix && (
            <div className="pointer-events-none inset-y-0 left-0 flex items-center pl-1 z-[1]">
              <span className="text-gray-500 sm:text-sm">{suffix}</span>
            </div>
          )}
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

const InputPrefix = ({ prefix, prefixRef }: { prefix: string; prefixRef: React.RefObject<HTMLSpanElement> }) => {
  if (!prefix) return "";
  return (
    <div className="pointer-events-none inset-y-0 flex items-center pl-1 z-[1] absolute top-1/2 left-1 -translate-y-1/2">
      <span className="text-indigo-950  sm:text-sm" ref={prefixRef}>
        {prefix}
      </span>
    </div>
  );
};
