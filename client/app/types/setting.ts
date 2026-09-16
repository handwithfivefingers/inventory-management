/**
 * Client-safe shared setting types + defaults.
 * No server imports here — safe to import from components/routes (browser bundle).
 */

export interface ICodeFormatMap {
  order?: string;
  customer?: string;
  product?: string;
  category?: string;
}

export interface IShipDeliveryConfig {
  enabled?: boolean;
  fee?: number;
  freeThreshold?: number | null;
  note?: string | null;
}

export interface IAppearanceConfig {
  /** Niche preset key (fashion | food | retail | electronics | pharmacy | beauty) */
  preset?: string;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  /** Label overrides keyed by i18n key, e.g. { "sidebar.products": "Món ăn" } */
  terminology?: Record<string, string>;
  /** Module keys hidden from sidebar/bottom-nav (admin-only, FE-only). */
  sidebarHidden?: string[];
}

export interface IVendorSettings {
  id?: number;
  vendorId?: number | null;
  language?: string;
  theme?: string;
  moneyUnit?: string;
  moneyUnitPosition?: "prefix" | "suffix";
  /** +/- step for money steppers (e.g. 1000 for VND pricing) */
  moneyStep?: number;
  skuTemplate?: string;
  codePrefix?: ICodeFormatMap;
  codeSuffix?: ICodeFormatMap;
  shipDelivery?: IShipDeliveryConfig;
  defaultTaxRate?: number;
  defaultDiscount?: number;
  defaultSurcharge?: number;
  /** Niche-based UI customization (preset palette, colors, logo, terminology) */
  appearance?: IAppearanceConfig;
}

export const DEFAULT_SETTINGS: IVendorSettings = {
  language: "vi",
  theme: "system",
  moneyUnit: "VND",
  moneyUnitPosition: "suffix",
  moneyStep: 1000,
  skuTemplate: "{CODE}",
  codePrefix: { order: "", customer: "", product: "", category: "" },
  codeSuffix: { order: "", customer: "", product: "", category: "" },
  shipDelivery: { enabled: false, fee: 0 },
  defaultTaxRate: 0,
  defaultDiscount: 0,
  defaultSurcharge: 0,
  appearance: {},
};

/**
 * Vendor master-data profile (brand + invoicing identity).
 * `legal_name` is nullable: documents fall back to `name`, then owner email.
 */
export interface IVendorProfile {
  id?: number;
  name?: string;
  legal_name?: string | null;
  tax_number?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  invoice_series_prefix?: string | null;
  /** Computed display name (legal_name -> name -> owner), read-only. */
  displayName?: string;
}

export const DEFAULT_VENDOR_PROFILE: IVendorProfile = {
  name: "",
  legal_name: null,
  tax_number: null,
  address: null,
  email: null,
  phone: null,
  invoice_series_prefix: null,
};
