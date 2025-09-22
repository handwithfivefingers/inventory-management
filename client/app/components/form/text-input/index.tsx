import React, { HTMLInputTypeAttribute, forwardRef, useRef } from "react";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";
import styles from "./styles.module.scss";
import { useFormContext, useFormState } from "react-hook-form";
export interface ITextInput extends BaseProps, React.InputHTMLAttributes<HTMLInputTypeAttribute> {
  label?: string;
  name?: string;
  prefix?: string | React.ReactNode | any;
  suffix?: string | React.ReactNode | any;
  placeholder?: string;
  value?: string;
  type?: string | undefined | any;
  inputClassName?: string;
  wrapperClassName?: string;
}

interface IFieldError {
  [key: string]: {
    message: string;
  };
}

export const TextInput = forwardRef<HTMLInputElement, ITextInput>(
  (
    { label, name, prefix, placeholder, className, wrapperClassName, style, onChange, inputClassName, suffix, ...rest },
    ref
  ) => {
    const prefixRef = useRef<HTMLSpanElement>(null);
    const { errors } = name ? (useFormState() as { errors: IFieldError }) : { errors: undefined };
    const { clearErrors } = name ? useFormContext() : { clearErrors: (arg: string) => {} };
    return (
      <div className={cn(styles.inputWrapper, styles.wrapperClassName)}>
        <InputLabel name={name} label={label} />
        <div className={cn("relative rounded-md flex items-center w-full")}>
          <InputPrefix prefix={prefix} prefixRef={prefixRef} />
          <input
            name={name}
            id={name}
            className={cn(
              "block w-full bg-transparent rounded-md border-0 text-gray-900  placeholder:text-gray-400  text-base outline-none  py-1.5 px-3 text-sm",
              styles.input,
              inputClassName,
              className,
              {
                ["!ring-1 !ring-red-600 !ring-inset "]: name && errors?.[name]?.message,
              }
            )}
            placeholder={placeholder}
            {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
            ref={ref}
            onChange={(e) => {
              clearErrors(name as string);
              onChange?.(e as any);
            }}
            style={style}
          />
          {suffix && (
            <div className="pointer-events-none inset-y-0 left-0 flex items-center pl-1 z-[1]">
              <span className="text-gray-500 sm:text-sm">{suffix}</span>
            </div>
          )}
          <div
            className={cn(
              "absolute rounded-sm left-0 top-0 w-full h-full ring-1 ring-gray-300  -z-[1] bg-white dark:bg-slate-100",
              styles.outline,
              className
            )}
          />
        </div>
        {/* {name && errors?.[name]?.message && <p className="text-red-500 p-2">{errors?.[name]?.message as string}</p>} */}
      </div>
    );
  }
);

const InputLabel = ({ label, name }: { label?: string; name?: string }) => {
  if (!label) return;
  return (
    <label htmlFor={name} className="block text-sm/6 font-medium text-gray-900">
      {label}
    </label>
  );
};

const InputPrefix = ({ prefix, prefixRef }: { prefix: string; prefixRef: React.RefObject<HTMLSpanElement> }) => {
  if (!prefix) return "";
  return (
    <div className="pointer-events-none inset-y-0 left-0 flex items-center pl-1 z-[1]">
      <span className="text-indigo-950 sm:text-sm" ref={prefixRef}>
        {prefix}
      </span>
    </div>
  );
};
