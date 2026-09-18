import { TMButton } from "~/components/tm-button";
import { TMModal } from "~/components/tm-modal";
import { SwitchInput } from "../switch-input";
import type { BulkUpdateFields } from "./types";

const BULK_FIELDS = [
  ["regularPrice", "Giá bán lẻ"],
  ["costPrice", "Giá gốc"],
  ["wholeSalePrice", "Giá sỉ"],
  ["salePrice", "Giá khuyến mãi"],
  ["quantity", "Tồn kho"],
  ["isActive", "Trạng thái"],
] as const;

interface BulkUpdateModalProps {
  fields: BulkUpdateFields;
  onApply: () => void;
  onClose: () => void;
  onFieldsChange: (fields: BulkUpdateFields) => void;
  open: boolean;
}

export const BulkUpdateModal = ({
  fields,
  onApply,
  onClose,
  onFieldsChange,
  open,
}: BulkUpdateModalProps) => {
  const updateField = (
    key: string,
    patch: Partial<BulkUpdateFields[string]>
  ) => {
    onFieldsChange({ ...fields, [key]: { ...fields[key], ...patch } });
  };

  return (
    <TMModal open={open} close={onClose} width={560} title="Cập nhật hàng loạt">
      <div className="flex w-full flex-col gap-4">
        <p className="text-sm text-slate-500">
          Chọn trường và giá trị muốn áp dụng cho tất cả biến thể hiện tại.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {BULK_FIELDS.map(([key, label]) => {
            const field = fields[key];
            return (
              <label
                key={key}
                className="flex items-center gap-2 rounded border border-slate-200 p-2 dark:border-slate-700"
              >
                <input
                  type="checkbox"
                  checked={field.enabled}
                  onChange={(event) =>
                    updateField(key, { enabled: event.target.checked })
                  }
                />
                <span className="flex-1 text-sm">{label}</span>
                {key === "isActive" ? (
                  <SwitchInput
                    checked={Boolean(field.value)}
                    onChange={(event: any) =>
                      updateField(key, { value: event.target.checked })
                    }
                  />
                ) : (
                  <input
                    className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                    type="number"
                    value={String(field.value)}
                    onChange={(event) =>
                      updateField(key, { value: event.target.value })
                    }
                  />
                )}
              </label>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 border-t pt-3">
          <TMButton type="button" variant="ghost" onClick={onClose}>
            Hủy
          </TMButton>
          <TMButton type="button" onClick={onApply}>
            Áp dụng
          </TMButton>
        </div>
      </div>
    </TMModal>
  );
};
