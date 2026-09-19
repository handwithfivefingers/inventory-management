import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { getBarcodeUnitOptions, SimpleProductEditor } from "../simple-product";

vi.mock("~/components/permission-guard", () => ({ PermissionGuard: ({ children }: any) => children }));

const units = [
  { id: 1, name: "Cái", isDefault: true },
  { id: 2, name: "Hộp" },
  { id: 3, name: "Lốc" },
];

function Subject({ barcodes = [], onReady }: { barcodes?: any[]; onReady?: (form: any) => void }) {
  const form = useForm<any>({ defaultValues: { variants: [{ barcodes }] } });
  useEffect(() => {
    onReady?.(form);
  }, [form, onReady]);
  return (
    <FormProvider {...form}>
      <SimpleProductEditor units={units} />
    </FormProvider>
  );
}

describe("SimpleProductEditor", () => {
  it("initializes an empty form with a non-removable base barcode at conversion rate one", async () => {
    render(<Subject />);

    const conversionRate = await screen.findByRole("textbox", { name: "Tỷ lệ quy đổi" });
    expect(conversionRate).toBeDisabled();
    expect(screen.queryByText("Xóa")).not.toBeInTheDocument();
  });

  it("uses the explicitly marked default unit instead of the first unit", async () => {
    let form: any;
    render(<Subject onReady={(methods) => (form = methods)} />);

    await screen.findByRole("textbox", { name: "Tỷ lệ quy đổi" });
    expect(form.getValues("variants.0.barcodes.0.unitId")).toBe(1);
  });

  it("adds and removes secondary barcode rows while preserving the base row", async () => {
    render(
      <Subject
        barcodes={[{ barcode: "BASE", unitId: 1, conversionRate: 1, costPrice: 0, retailPrice: 0, wholesalePrice: 0 }]}
      />,
    );

    fireEvent.click(screen.getByText("Thêm mã vạch"));
    expect(await screen.findByText("Xóa")).toBeInTheDocument();
    expect(document.getElementById("variants.0.barcodes.0.conversionRate")).toBeDisabled();

    fireEvent.click(screen.getByText("Xóa"));
    expect(screen.queryByText("Xóa")).not.toBeInTheDocument();
    expect(document.getElementById("variants.0.barcodes.0.conversionRate")).toBeDisabled();
  });

  it("moves an existing base row first without changing its barcode object", async () => {
    let form: any;
    const baseBarcode = {
      id: 10,
      barcode: "BASE",
      unitId: 1,
      conversionRate: 1,
      costPrice: 10,
      retailPrice: 15,
      wholesalePrice: 12,
      promoPrice: 9,
      promoStartAt: "2026-01-01",
      promoEndAt: "2026-01-02",
    };
    render(
      <Subject
        onReady={(methods) => {
          form = methods;
        }}
        barcodes={[
          {
            id: 20,
            barcode: "PACK",
            unitId: 2,
            conversionRate: 12,
            costPrice: 20,
            retailPrice: 30,
            wholesalePrice: 25,
          },
          baseBarcode,
        ]}
      />,
    );

    await screen.findByDisplayValue("BASE");
    expect(screen.getAllByRole("textbox", { name: "Mã vạch" })[0]).toHaveValue("BASE");
    expect(document.getElementById("variants.0.barcodes.0.conversionRate")).toHaveValue("1");
    expect(screen.getAllByRole("textbox", { name: "Giá vốn" })[0]).toHaveValue("10");
    expect(form.getValues("variants.0.barcodes.0")).toEqual(baseBarcode);
  });

  it("excludes units selected by other barcode rows while retaining the row's selected unit", () => {
    expect(getBarcodeUnitOptions(units, new Set(["1", "2"]), 2)).toEqual([
      { label: "Hộp", value: 2 },
      { label: "Lốc", value: 3 },
    ]);
  });

  it("does not duplicate the base row after a form reset", async () => {
    let form: any;
    render(<Subject onReady={(methods) => (form = methods)} />);
    await screen.findByRole("textbox", { name: "Tỷ lệ quy đổi" });

    act(() => form.reset({ variants: [{ barcodes: [] }] }));

    await screen.findByRole("textbox", { name: "Tỷ lệ quy đổi" });
    expect(document.querySelectorAll('[id$=".conversionRate"]')).toHaveLength(1);
    expect(document.getElementById("variants.0.barcodes.0.conversionRate")).toBeDisabled();
  });

  it("shows an error and preserves legacy data when no base barcode exists", async () => {
    const barcodes = [
      { id: 20, barcode: "PACK", unitId: 2, conversionRate: 12, costPrice: 20, retailPrice: 30, wholesalePrice: 25 },
    ];
    let form: any;
    render(
      <Subject
        barcodes={barcodes}
        onReady={(methods) => {
          form = methods;
        }}
      />,
    );

    expect(await screen.findByText("Cần một mã vạch đơn vị gốc có tỷ lệ quy đổi bằng 1")).toBeInTheDocument();
    expect(document.getElementById("variants.0.barcodes.0.conversionRate")).toHaveValue("12");
    expect(document.getElementById("variants.0.barcodes.0.conversionRate")).not.toBeDisabled();
    expect(form.getValues("variants.0.barcodes")).toEqual(barcodes);
  });
});
