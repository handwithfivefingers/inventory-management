import { HTTPService } from "~/http/index.server";
import { ITag, ITagParams, ITagQueryParams } from "~/types/tag";

const API_PATH = {
  tags: "/tags",
};

const tagsService = {
  get: (searchParams: ITagQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return HTTPService.getInstance().get<{ data: ITag[]; total: number }>(API_PATH.tags + "?" + qs.toString());
  },
  update: ({ id, ...params }: ITagParams) => {
    return HTTPService.getInstance().post(`${API_PATH.tags}/${id}`, params);
  },
  create: ({ ...params }: ITagParams) => {
    return HTTPService.getInstance().post(API_PATH.tags, params);
  },
  getById: (id: Partial<string | number>) => {
    return HTTPService.getInstance().get<{ data: ITag }>(API_PATH.tags + "/" + id);
  },
  delete: (id: Partial<string | number>) => {
    return HTTPService.getInstance().delete(API_PATH.tags + "/" + id);
  },
};

export { tagsService };
