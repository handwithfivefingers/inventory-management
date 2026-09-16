import { IVendor } from "./vendor";
import { IWareHouse } from "./warehouse";

export type PermissionMethod = "CREATE" | "READ" | "UPDATE" | "DELETE";

/**
 * Single catalog row as returned by the backend.
 * GET /roles/:id -> { data: { permissions: Array<{ id, name, method }> } }
 * where `name` is a canonical module key (see ~/constants/modules)
 * and `method` is one granted action on that module.
 */
export interface IPermission {
  id: number;
  name: string;
  method: PermissionMethod;
}

/**
 * CRUD grant flags for one module, used by the role editor matrix UI.
 * Maps to backend catalog rows: C -> CREATE, R -> READ, U -> UPDATE, D -> DELETE.
 */
export interface IPermissionGrant {
  name: string;
  C: boolean;
  R: boolean;
  U: boolean;
  D: boolean;
}

export interface IRole {
  id: number;
  name: string;
  description?: string | null;
  vendorId?: number | null;
  isSystem?: boolean;
  isGlobal?: boolean;
  isAdmin?: boolean;
  permissionCount?: number;
  permissions: IPermission[];
  createdAt?: string;
  updatedAt?: string;
}

/** POST /roles/create body (see backend-ts/src/routers/role/validator.ts). */
export interface IRoleCreateDTO {
  name: string;
  description?: string;
  vendorId?: number;
  /** Module keys with at least one grant. Validator requires string[]. */
  permissions?: string[];
  /**
   * Full CRUD matrix. Not yet accepted by the backend validator/service
   * (see mismatch notes) - sent alongside for forward-compat, ignored today.
   */
  permissionGrants?: IPermissionGrant[];
}

/** PUT /roles/:id body. Backend requires vendorId to scope the lookup. */
export interface IRoleUpdateDTO extends IRoleCreateDTO {
  id: number;
}

export interface IUser {
  id: number;
  email: string;
  fullName?: string;
  subscription?: string;
  role?: IRole[];
  vendors?: IVendor[];
  defaultVendorId?: number | null;
  defaultWarehouseId?: number | null;
}

export interface ILoginResponse {
  data: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    nickname?: string;
    subscription?: string;
    roles?: IRole[];
    vendors?: IVendor[];
    defaultVendorId?: number | null;
    defaultWarehouseId?: number | null;
    token: string;
  };
}
