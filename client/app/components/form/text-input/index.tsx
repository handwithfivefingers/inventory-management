import React, { HTMLInputTypeAttribute, forwardRef, useRef } from "react";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";
import styles from "./styles.module.scss";
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

export const TextInput = forwardRef<HTMLInputElement, ITextInput>(
  (
    { label, name, prefix, placeholder, className, wrapperClassName, style, onChange, inputClassName, suffix, ...rest },
    ref
  ) => {
    const prefixRef = useRef<HTMLSpanElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    return (
      <div className={cn(styles.inputWrapper, styles.wrapperClassName)}>
        {label ? (
          <label htmlFor={name} className="block text-sm/6 font-medium text-gray-900">
            {label}
          </label>
        ) : (
          ""
        )}
        <div className={cn("relative rounded-md flex items-center ")}>
          {prefix && (
            <div className="pointer-events-none inset-y-0 left-0 flex items-center pl-1 z-[1]">
              <span className="text-gray-500 sm:text-sm" ref={prefixRef}>
                {prefix}
              </span>
            </div>
          )}
          <input
            name={name}
            id={name}
            className={cn(
              "block w-full bg-transparent rounded-md border-0   text-gray-900  placeholder:text-gray-400  text-base outline-none  py-1.5 px-3",
              styles.input,
              inputClassName
            )}
            placeholder={placeholder}
            {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
            ref={ref}
            // onChange={(e) => onChange?.(e.target.value as any)}
            onChange={(e) => onChange?.(e as any)}
            style={style}
          />
          {suffix && (
            <div className="pointer-events-none inset-y-0 left-0 flex items-center pl-1 z-[1]">
              <span className="text-gray-500 sm:text-sm">{suffix}</span>
            </div>
          )}
          <div
            className={cn(
              "absolute rounded-md left-0 top-0 w-full h-full ring-1 ring-gray-300  -z-[1] shadow-sm bg-white",
              styles.outline,
              className
            )}
          />
        </div>
      </div>
    );
  }
);
