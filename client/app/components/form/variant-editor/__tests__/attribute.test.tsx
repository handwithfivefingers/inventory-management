import { FormProvider, useForm } from "react-hook-form";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PropsWithChildren } from "react";
import type { ProductSchemaType } from "~/constants/schema/product";

vi.mock("@remix-run/react", () => ({
  useFetcher: () => ({ data: undefined, state: "idle", submit: vi.fn() }),
  useLoaderData: () => ({}),
  useRevalidator: () => ({ revalidate: vi.fn() }),
}));

vi.mock("~/hooks", () => ({ useSubmitPromise: () => ({ isLoading: false, submit: vi.fn() }) }));
vi.mock("~/i18n", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("~/components/icon", () => ({ Icon: () => null }));
vi.mock("~/components/tm-button", () => ({
  TMButton: ({ children, onClick, ...props }: PropsWithChildren<{ onClick?: () => void }>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));
vi.mock("../../creatable-select-input", () => ({
  CreatableSelectInput: ({ onSelect }: { onSelect: (value: string) => void }) => (
    <button onClick={() => onSelect("Size")}>select attribute</button>
  ),
}));
vi.mock("../../creatable-tag-input", () => ({
  CreatableTagInput: ({ onChange }: { onChange: (values: { label: string; value: string }[]) => void }) => (
    <button onClick={() => onChange([{ label: "Blue", value: "Blue" }])}>replace values</button>
  ),
}));

import { AttributeVariant } from "../attribute";

const AttributeForm = ({ onReady }: { onReady: (form: ReturnType<typeof useForm<ProductSchemaType>>) => void }) => {
  const form = useForm<ProductSchemaType>({
    defaultValues: {
      variantAttributes: [{ id: "attribute-1", name: "Color", values: [{ label: "Red", value: "Red" }] }],
    },
  });
  onReady(form);
  return (
    <FormProvider {...form}>
      <AttributeVariant />
    </FormProvider>
  );
};

describe("AttributeVariant", () => {
  it("updates attribute names and values through field-array operations", () => {
    let form: ReturnType<typeof useForm<ProductSchemaType>> | undefined;
    render(<AttributeForm onReady={(methods) => (form = methods)} />);

    fireEvent.click(screen.getByRole("button", { name: "select attribute" }));
    expect(form?.getValues("variantAttributes.0")).toEqual({
      id: "attribute-1",
      name: "Size",
      values: [{ label: "Red", value: "Red" }],
    });

    fireEvent.click(screen.getByRole("button", { name: "replace values" }));
    expect(form?.getValues("variantAttributes.0.values")).toEqual([{ label: "Blue", value: "Blue" }]);
  });
});
