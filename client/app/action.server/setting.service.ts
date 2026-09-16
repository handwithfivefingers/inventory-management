import { HTTPService } from "~/http/index.server";
import type { IVendorProfile, IVendorSettings } from "~/types/setting";

const API_PATH = {
  settings: "/settings",
  vendorSettings: "/settings/vendor",
};

/**
 * Vendor master-data profile types live in ~/types/setting (client-safe).
 * This module is server-only: it pulls ~/http/index.server (getContext).
 */
export const settingService = {
  /**
   * Get the settings for a vendor (creates defaults on first access)
   */
  getSettings: async () => {
    return HTTPService.getInstance().get<{ data: IVendorSettings }>(API_PATH.settings);
  },

  /**
   * Update the settings for a vendor
   */
  updateSettings: async (payload: Partial<IVendorSettings>) => {
    return HTTPService.getInstance().put(`${API_PATH.settings}`, payload);
  },
};

export const vendorSettingService = {
  /**
   * Get the vendor master-data profile for the active workspace vendor.
   * The backend scopes this strictly to the active vendor context.
   */
  getVendorSettings: async () => {
    return HTTPService.getInstance().get<{ data: IVendorProfile }>(API_PATH.vendorSettings);
  },

  updateVendorSettings: async (payload: Partial<IVendorProfile>) => {
    return HTTPService.getInstance().put(`${API_PATH.vendorSettings}`, payload);
  },
};
