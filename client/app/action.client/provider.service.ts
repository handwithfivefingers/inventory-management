import { http } from "~/http";

const API_PATH = {
  provider: "/providers",
};

const providerService = {
  getProviders: () => {
    return http.get(API_PATH.provider);
  },
  getProviderById: (documentId: string) => {
    const params = new URLSearchParams({});
    return http.get(API_PATH.provider + "/" + documentId + "?" + params.toString());
  },
};

export { providerService };
