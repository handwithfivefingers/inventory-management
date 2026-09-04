import { forwardRef, useRef } from "react";
import { useFormState } from "react-hook-form";
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
export const CheckboxInput = forwardRef<HTMLInputElement, ICheckboxInput>(
  (
    {
      label,
      name,
      className,
      wrapperClassName,
      style,
      onChange,
      inputClassName,
      suffix,
      value = false,
      disabled = false,
      ...rest
    },
    ref,
  ) => {
    const { errors } = name ? (useFormState() as { errors: IFieldError }) : { errors: undefined };
    const inputRef = useRef<HTMLInputElement>(null);

    return (
      <div className={cn("")}>
        {label ? (
          <label htmlFor={name} className="block text-sm/6 font-medium text-indigo-950 dark:text-slate-200">
            {label}
          </label>
        ) : (
          ""
        )}
        <div className={cn("relative rounded-md flex items-center ")}>
          <div
            className={cn("rounded-full w-9 bg-white border-[2px] h-5 relative cursor-pointer border-slate-400", {
              ["border-primary"]: value,
            })}
            onClick={() => inputRef.current?.click()}
          >
            <input
              type="checkbox"
              className={cn("hidden")}
              checked={value}
              name={name}
              onChange={onChange}
              ref={inputRef}
              disabled={disabled}
            />
            <span
              className={cn(
                "w-3.5 h-3.5 bg-slate-400 shadow-xl flex items-center justify-center rounded-full absolute top-1/2 left-0 transform  -translate-y-1/2 translate-x-0.5 transition-all",
                {
                  "translate-x-[calc(100%+2px)] bg-primary": value,
                },
              )}
            />
          </div>
        </div>
        {name && errors?.[name]?.message && <p className="text-red-500 p-2">{errors?.[name]?.message as string}</p>}
      </div>
    );
  },
);
