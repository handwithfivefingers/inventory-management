import { HTTPService } from "~/http";

const API_PATH = {
  settings: "/settings",
};

interface ISettingServiceParams {
  cookie: string;
  vendorId?: number | string;
}

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
};

export const settingService = {
  /**
   * Get the settings for a vendor (creates defaults on first access)
   */
  getSettings: async ({ cookie, vendorId }: ISettingServiceParams) => {
    const query = vendorId ? `?vendorId=${vendorId}` : "";
    const response = await fetch(`${import.meta.env.VITE_API_PATH}${API_PATH.settings}${query}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to fetch settings");
    }

    return result.data as IVendorSettings;
  },

  /**
   * Update the settings for a vendor
   */
  updateSettings: async ({ cookie, ...payload }: ISettingServiceParams & Partial<IVendorSettings>) => {
    const qs = new URLSearchParams({
      vendorId: `${payload.vendorId}`,
    });
    return HTTPService.getInstance().put(`${API_PATH.settings}?${qs.toString()}`, payload, { cookie });
  },
};
