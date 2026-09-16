import { HTTPService } from "~/http/index.server";
import { IVendor } from "~/types/vendor";

const API_PATH = {
  vendor: "/vendor",
};

const vendorService = {
  getVendor: ({ cookie }: { cookie: string }) => {
    return HTTPService.getInstance().get<{ data: IVendor[] }>(API_PATH.vendor, { Cookie: cookie });
  },
};

export { vendorService };
