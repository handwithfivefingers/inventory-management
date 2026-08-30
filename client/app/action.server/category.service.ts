import { HTTPService } from "~/http";
import { ICategory, ICategoryParams, ICategoryQueryParams } from "~/types/category";

const API_PATH = {
  categories: "/categories",
};

const categoryService = {
  get: ({ cookie, ...searchParams }: ICategoryQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return HTTPService.getInstance().get<{ data: ICategory[]; total: number }>(
      API_PATH.categories + "?" + qs.toString(),
      { Cookie: cookie },
    );
  },
  create: ({ cookie, vendorId, ...params }: ICategoryParams & { cookie: string }) => {
    const qs = new URLSearchParams({
      vendorId: `${vendorId}`,
    });
    return HTTPService.getInstance().post(API_PATH.categories + `?${qs.toString()}`, params, { Cookie: cookie });
  },
  getById: ({ id, cookie, vendorId }: { id: string | number; cookie: string; vendorId: string | number }) => {
    const params = new URLSearchParams({
      vendorId: `${vendorId}`,
    });
    const qs = params.toString();
    return HTTPService.getInstance().get<ICategory>(`${API_PATH.categories}/${id}?${qs}`, {
      Cookie: cookie,
    });
  },
  update: ({ id, cookie, vendorId, ...params }: ICategoryParams & { cookie: string; vendorId?: string | number }) => {
    const qs = new URLSearchParams({
      vendorId: `${vendorId}`,
    });
    return HTTPService.getInstance().post(`${API_PATH.categories}/${id}?${qs.toString()}`, params, { Cookie: cookie });
  },
};

export { categoryService };
