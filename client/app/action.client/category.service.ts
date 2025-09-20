import { http } from "~/http";
import { ICategory, ICategoryParams, ICategoryQueryParams } from "~/types/category";
import { IResponse } from "~/types/common";

const API_PATH = {
  categories: "/categories",
};

const categoryService = {
  get: (searchParams: ICategoryQueryParams): Promise<IResponse<ICategory[]>> => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get(API_PATH.categories + "?" + qs.toString());
  },
  create: (params: ICategoryParams) => {
    return http.post(API_PATH.categories, params);
  },
  getById: ({ id }: { id: string | number }): Promise<IResponse<ICategory>> => {
    const params = new URLSearchParams({});
    return http.get(API_PATH.categories + "/" + id + "?" + params.toString());
  },
  update: ({ id, ...params }: ICategoryParams): Promise<IResponse<ICategory[]>> => {
    return http.post(`${API_PATH.categories}/${id}`, params);
  },
};

export { categoryService };
