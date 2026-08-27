import React, { forwardRef } from "react";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";
import styles from "./styles.module.scss";
import { useFormContext, useFormState } from "react-hook-form";

export interface IInputSlider extends BaseProps {
  label?: string;
  name?: string;
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  /** Unit displayed next to the value, e.g. "%" or "kg" */
  suffix?: string;
  /** Show min/max labels under the track */
  showBounds?: boolean;
  disabled?: boolean;
  wrapperClassName?: string;
  style?: React.CSSProperties;
  error?: string;
  required?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

interface IFieldError {
  [key: string]: {
    message: string;
  };
}

export const InputSlider = forwardRef<HTMLInputElement, IInputSlider>(
  (
    {
      label,
      name,
      value,
      min = 0,
      max = 100,
      step = 1,
      suffix,
      showBounds,
      disabled,
      className,
      wrapperClassName,
      style,
      error,
      required,
      onChange,
    },
    ref,
  ) => {
    const { errors } = name ? (useFormState() as { errors: IFieldError }) : { errors: undefined };
    const { clearErrors } = name ? useFormContext() : { clearErrors: (arg: string) => {} };

    const hasError = error || (name && errors?.[name]?.message);
    const currentValue = Number(value ?? min);
    const progress = max > min ? ((currentValue - min) / (max - min)) * 100 : 0;

    return (
      <div className={cn(styles.inputWrapper, wrapperClassName)}>
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={name} className="block text-sm/6 font-medium text-gray-900 dark:text-slate-200">
              {label}
              {required && <span className="text-rose-600"> *</span>}
            </label>
          )}
          <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            {currentValue}
            {suffix}
          </span>
        </div>
        <input
          type="range"
          name={name}
          id={name}
          className={cn(styles.slider, className)}
          style={{ ...style, ["--progress" as any]: `${progress}%` }}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          ref={ref}
          onChange={(e) => {
            clearErrors(name as string);
            onChange?.(e);
          }}
        />
        {showBounds && (
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span>
              {min}
              {suffix}
            </span>
            <span>
              {max}
              {suffix}
            </span>
          </div>
        )}
        {(error || (name && errors?.[name]?.message)) && (
          <p className="text-red-500 p-2">{(error || errors?.[name!]?.message) as string}</p>
        )}
      </div>
    );
  },
);
