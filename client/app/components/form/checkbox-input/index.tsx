import React, { HTMLInputTypeAttribute, forwardRef, useRef } from "react";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";
import styles from "./styles.module.scss";
import { useFormState } from "react-hook-form";

interface IFieldError {
  [key: string]: {
    message: string;
  };
}

interface ICheckboxInput {
  value?: boolean;
  [key: string]: any;
}
export const CheckboxInput = forwardRef<HTMLInputElement, ICheckboxInput>(
  (
    { label, name, className, wrapperClassName, style, onChange, inputClassName, suffix, value = false, ...rest },
    ref
  ) => {
    const { errors } = name ? (useFormState() as { errors: IFieldError }) : { errors: undefined };
    const inputRef = useRef<HTMLInputElement>(null);

    return (
      <div className={cn(styles.inputWrapper, styles.wrapperClassName)}>
        {label ? (
          <label htmlFor={name} className="block text-sm/6 font-medium text-indigo-950 dark:text-slate-200">
            {label}
          </label>
        ) : (
          ""
        )}
        <div className={cn("relative rounded-md flex items-center ")}>
          <div
            className="rounded-full w-9 bg-white border-indigo-600 border-[2px] h-5 relative cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <input
              type="checkbox"
              className={cn("hidden", styles.input)}
              value={value}
              name={name}
              onChange={onChange}
              ref={inputRef}
            />
            <span
              className={cn(
                "w-3.5 h-3.5 bg-indigo-600 shadow-xl flex items-center justify-center rounded-full absolute top-1/2 left-0 transform  -translate-y-1/2 translate-x-0.5 transition-all",
                styles.dot
              )}
            />
          </div>
        </div>
        {name && errors?.[name]?.message && <p className="text-red-500 p-2">{errors?.[name]?.message as string}</p>}
      </div>
    );
  }
);
