import React from "react";
import { Controller, useFormContext, type FieldError } from "react-hook-form";
import { cn } from "~/libs/utils";
interface IProps {
  name: string;
  children: React.ReactElement;
  className?: string;
  size?: "sm" | "md";
}
export const FormControl = ({ size = "sm", ...props }: IProps) => {
  const form = useFormContext();
  const errors = form.formState.errors;
  const recursiveObject = (obj: object, keys: string) => {
    let result = obj;
    const split = keys.split(".");
    if (split.length) {
      for (const k of split) {
        if (k && k in result) {
          result = result[k as keyof typeof result];
        }
      }
    }
    return result;
  };

  const error = recursiveObject(errors, props.name);
  const isError = !!(error as FieldError)?.message;
  return (
    <div className={cn("flex flex-col gap-1", props?.className, {})}>
      <Controller
        name={props.name}
        control={form.control}
        render={({ field }) => {
          return React.cloneElement(props.children, {
            ...(props.children?.props as Record<string, unknown>),
            ...field,
          });
        }}
      />
      {(error as { message: string })?.message && (
        <span
          className={cn("text-rose-600", {
            ["text-base font-semibold "]: size === "md",
            ["text-sm "]: size === "sm",
          })}
        >
          {(error as FieldError).message}
        </span>
      )}
    </div>
  );
};
