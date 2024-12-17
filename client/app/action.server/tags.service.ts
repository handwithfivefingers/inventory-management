import { http } from "~/http";
import { ICategory, ICategoryParams, ICategoryQueryParams } from "~/types/category";
import { IResponse } from "~/types/common";

const API_PATH = {
  tags: "/tags",
};

const tagsService = {
  get: (searchParams: ICategoryQueryParams): Promise<IResponse<ICategory[]>> => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get(API_PATH.tags + "?" + qs.toString());
  },
  create: (params: ICategoryParams) => {
    return http.post(API_PATH.tags, params);
  },
  getById: ({ id }: { id: string | number }): Promise<IResponse<ICategory>> => {
    const params = new URLSearchParams({});
    return http.get(API_PATH.tags + "/" + id + "?" + params.toString());
  },
};

export { tagsService };
