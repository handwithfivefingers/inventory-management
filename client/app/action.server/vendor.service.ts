import { HTTPService } from "~/http";
import { IVendor } from "~/types/vendor";

const API_PATH = {
  vendor: "/vendor",
};

const vendorService = {
  getVendor: ({ cookie }: { cookie: string }) => {
    return HTTPService.getInstance().get<IVendor[]>(API_PATH.vendor, { Cookie: cookie });
  },
};

export { vendorService };
