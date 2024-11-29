import React from "react";
import { FieldValues, UseFieldArrayReturn, useFieldArray } from "react-hook-form";

export const FormList = ({
  control,
  children,
  name,
}: {
  control: any;
  name: string;
  children: (formListMethod: UseFieldArrayReturn<FieldValues, string, "id">) => React.ReactNode;
}) => {
  const arrayMethods = useFieldArray({
    control, // control props comes from useForm (optional: if you are using FormProvider)
    name: name, // unique name for your Field Array
  });

  return children?.(arrayMethods);
};
