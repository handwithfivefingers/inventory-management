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
    return HTTPService.getInstance().get<{ data: ITag[]; total: number }>(API_PATH.tags + "?" + qs.toString(), { Cookie });
  },
  update: ({ id, cookie: Cookie, vendorId, ...params }: ITagParams & { vendorId?: string | number }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return HTTPService.getInstance().post(`${API_PATH.tags}/${id}${qs}`, params, { Cookie });
  },
  create: ({ cookie: Cookie, ...params }: ITagParams) => {
    return HTTPService.getInstance().post(API_PATH.tags, params, { Cookie });
  },
  getById: ({
    id,
    vendorId,
    cookie: Cookie,
  }: {
    id: Partial<string | number>;
    vendorId: Partial<string | number>;
    cookie: string;
  }) => {
    const params = new URLSearchParams({});
    if (vendorId !== undefined && vendorId !== null && `${vendorId}` !== "") params.set("vendorId", `${vendorId}`);
    const qs = params.toString();
    return HTTPService.getInstance().get<ITag>(API_PATH.tags + "/" + id + (qs ? "?" + qs : ""), { Cookie });
  },
};

export { tagsService };
