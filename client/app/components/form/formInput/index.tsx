import React from "react";
import { Controller, useFormContext } from "react-hook-form";

export const FormInput = ({
  children,
  name,
}: {
  children: React.ReactElement | ((field: any) => React.ReactNode);
  name: string;
}) => {
  const ctx = useFormContext();
  const { control, formState } = ctx;
  const errors = formState.errors;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        return (
          <div>
            {React.isValidElement(children) && React.cloneElement(children, { ...field, ...(children?.props as {}) })}
            {typeof children === "function" && children(field)}
            <div>{errors[name] ? <p className="text-red-500 py-1 text-sm">{errors?.[name]?.message as string}</p> : ""}</div>
          </div>
        );
      }}
    />
  );
};
