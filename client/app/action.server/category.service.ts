import { HTTPService } from "~/http/index.server";
import { ICategory, ICategoryParams, ICategoryQueryParams } from "~/types/category";

const API_PATH = {
  categories: "/categories",
};

const categoryService = {
  get: (searchParams: ICategoryQueryParams) => {
    return HTTPService.getInstance().get<{ data: ICategory[]; total: number }>(API_PATH.categories);
  },
  create: (params: ICategoryParams) => {
    return HTTPService.getInstance().post(API_PATH.categories, params);
  },
  getById: (id: string | number) => {
    return HTTPService.getInstance().get<{ data: ICategory }>(`${API_PATH.categories}/${id}`);
  },
  update: (id: string | number, params: ICategory) => {
    return HTTPService.getInstance().post(`${API_PATH.categories}/${id}`, params);
  },
  delete: (id: string | number) => {
    return HTTPService.getInstance().delete(API_PATH.categories + "/" + id);
  },
};

export { categoryService };
