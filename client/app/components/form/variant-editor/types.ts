import type { Option } from "../creatable-tag-input";

export type AttributeValueOption = Option;

export interface VariantEditorProps {
  /** Values copied from a simple product's type-0 default variant. */
  seed?: Partial<IVariantDraft>;
  protectFirstVariant?: boolean;
  units?: { id: number | string; name: string }[];
  type: 0 | 1 | 2;
}

export interface IVariantAttributeDraft {
  id?: number | string;
  name: string;
  values: AttributeValueOption[];
}

export interface IVariantDraft {
  variantId?: number | string;
  options: Record<string, string>;
  skuCode?: number | string;
  quantity?: number | string;
  barcodes?: any[];
  isNegative?: boolean;
  VAT?: number | string | null;
  isActive?: boolean;
}

export interface BarcodeManagerProps {
  index: number;
  units: { id: number | string; name: string }[];
}

export interface BulkUpdateValue {
  enabled: boolean;
  value: boolean | string;
}

export type BulkUpdateFields = Record<string, BulkUpdateValue>;
