import { HTTPService } from "~/http/index.server";
import type { IResponse } from "~/types/common";
import type { IRole, IRoleCreateDTO, IRoleUpdateDTO } from "~/types/user";

const API_PATH = {
  roles: "/roles",
};

export interface IRoleRequestContext {}

interface IGetRolesParams extends IRoleRequestContext {
  s?: string;
}

interface IGetRoleByIdParams extends IRoleRequestContext {
  id: string | number;
}

type ICreateRoleParams = IRoleRequestContext & IRoleCreateDTO;
type IUpdateRoleParams = IRoleRequestContext & IRoleUpdateDTO;
type IDeleteRoleParams = IRoleRequestContext & { id: string | number };

function authHeaders(cookie: string): Record<string, string> {
  return { Cookie: cookie };
}

function withVendorQuery(vendorId?: string | number): string {
  if (vendorId === undefined || vendorId === null || vendorId === "") return "";
  return `?vendorId=${encodeURIComponent(String(vendorId))}`;
}

const http = HTTPService.getInstance();

export const roleService = {
  /**
   * GET /roles?vendorId=... - vendorId is required by RoleService.getRoles.
   */
  getRoles: ({ s }: IGetRolesParams) => {
    const qs = new URLSearchParams();
    if (s) qs.set("s", s);
    return http.get<{ data: IRole[] }>(`${API_PATH.roles}?${qs.toString()}`);
  },

  /**
   * GET /roles/:id?vendorId=... - vendorId scopes the tenant check.
   */
  getRoleById: (id: number | string) => {
    return http.get<{ data: IRole }>(`${API_PATH.roles}/${id}`);
  },

  /**
   * POST /roles/create per backend router.
   * Body: { name, description?, vendorId?, permissions?: string[] }.
   */
  createRole: (body: ICreateRoleParams) => {
    const payload: IRoleCreateDTO = body;
    return http.post(`${API_PATH.roles}/create`, payload);
  },

  /**
   * PUT /roles/:id - vendorId is required so the service can scope
   * the lookup (findOne where { id, vendorId }).
   * NOTE: HTTPService.put resolves to { status } only (no data payload)
   * and throws the backend error body on non-200.
   */
  updateRole: ({ id, ...body }: IUpdateRoleParams): Promise<IResponse<unknown>> => {
    return http.put<unknown, Record<string, unknown>>(`${API_PATH.roles}/${id}`, body);
  },

  /**
   * DELETE /roles/:id. Resolves to { status } only, throws on non-200.
   */
  deleteRole: (id: string | number): Promise<IResponse<unknown>> => {
    return http.delete<unknown>(`${API_PATH.roles}/${id}`);
  },
};
