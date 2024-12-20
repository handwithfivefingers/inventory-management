import { http } from "~/http";
import { ICategoryParams } from "~/types/category";
import { IResponse } from "~/types/common";
import { ITag, ITagParams, ITagQueryParams } from "~/types/tag";

const API_PATH = {
  tags: "/tags",
};

const tagsService = {
  get: (searchParams: ITagQueryParams): Promise<IResponse<ITag[]>> => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get(API_PATH.tags + "?" + qs.toString());
  },
  update: ({ id, ...params }: ITagParams): Promise<IResponse<ITag[]>> => {
    return http.post(`${API_PATH.tags}/${id}`, params);
  },
  create: (params: ICategoryParams) => {
    return http.post(API_PATH.tags, params);
  },
  getById: ({ id }: { id: string | number }): Promise<IResponse<ITag>> => {
    const params = new URLSearchParams({});
    return http.get(API_PATH.tags + "/" + id + "?" + params.toString());
  },
};

export { tagsService };
