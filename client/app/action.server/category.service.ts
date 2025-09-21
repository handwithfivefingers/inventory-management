import { HTTPService } from "~/http";
import { ICategory, ICategoryParams, ICategoryQueryParams } from "~/types/category";

const API_PATH = {
  categories: "/categories",
};

const categoryService = {
  get: ({ cookie, ...searchParams }: ICategoryQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return HTTPService.getInstance().get<ICategory[]>(API_PATH.categories + "?" + qs.toString(), { Cookie: cookie });
  },
  create: ({ cookie, ...params }: ICategoryParams & { cookie: string }) => {
    return HTTPService.getInstance().post(API_PATH.categories, params);
  },
  getById: ({ id, cookie }: { id: string | number } & { cookie: string }) => {
    const params = new URLSearchParams({});
    return HTTPService.getInstance().get<ICategory>(API_PATH.categories + "/" + id + "?" + params.toString(), {
      Cookie: cookie,
    });
  },
  update: ({ id, cookie, ...params }: ICategoryParams & { cookie: string }) => {
    return HTTPService.getInstance().post(`${API_PATH.categories}/${id}`, params, { Cookie: cookie });
  },
};

export { categoryService };
