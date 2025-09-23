import { HTTPService } from "~/http";
import { ICategoryParams } from "~/types/category";
import { IResponse } from "~/types/common";
import { ITag, ITagParams, ITagQueryParams } from "~/types/tag";

const API_PATH = {
  tags: "/tags",
};

const tagsService = {
  get: ({ cookie: Cookie, ...searchParams }: ITagQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return HTTPService.getInstance().get<ITag[]>(API_PATH.tags + "?" + qs.toString(), { Cookie });
  },
  update: ({ id, cookie: Cookie, ...params }: ITagParams) => {
    return HTTPService.getInstance().post(`${API_PATH.tags}/${id}`, params, { Cookie });
  },
  create: ({ cookie: Cookie, ...params }: ITagParams) => {
    return HTTPService.getInstance().post(API_PATH.tags, params, { Cookie });
  },
  getById: ({
    id,
    cookie: Cookie,
  }: {
    id: Partial<string | number>;
    vendorId: Partial<string | number>;
    cookie: string;
  }) => {
    const params = new URLSearchParams({});
    return HTTPService.getInstance().get<ITag>(API_PATH.tags + "/" + id + "?" + params.toString(), { Cookie });
  },
};

export { tagsService };
