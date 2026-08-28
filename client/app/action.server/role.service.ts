import { HTTPService } from "~/http";
import { IRole } from "~/types/user";

const API_PATH = {
  roles: "/roles",
};

interface IRoleServiceParams {
  cookie: string;
}

interface ICreateRoleParams extends IRoleServiceParams {
  name: string;
  description?: string;
  permissions?: any[];
  vendorId?: number | string;
}

interface IUpdateRoleParams extends ICreateRoleParams {
  id: number;
}

interface IDeleteRoleParams extends IRoleServiceParams {
  id: number;
}

export const roleService = {
  /**
   * Get all roles (global + vendor-specific). Pass vendorId to filter.
   */
  getRoles: async ({ cookie, vendorId }: IRoleServiceParams & { vendorId?: string | number | null }) => {
    const qs = new URLSearchParams({
      vendorId: `${vendorId}`,
    });
    return HTTPService.getInstance().get<{ data: IRole[] }>(API_PATH.roles + "?" + qs.toString(), { cookie });
  },

  /**
   * Get role by ID
   */
  getRoleById: async ({ cookie, id, vendorId }: IRoleServiceParams & { id: number; vendorId?: string | number }) => {
    const qs = vendorId ? `?vendorId=${vendorId}` : "";
    return HTTPService.getInstance().get<{ data: IRole }>(`${API_PATH.roles}/${id}${qs}`, { cookie });
  },

  /**
   * Create new role - POST /roles/create per backend router
   */
  createRole: async ({ cookie, name, description, permissions, vendorId }: ICreateRoleParams) => {
    return HTTPService.getInstance().post(
      `${API_PATH.roles}/create`,
      { name, description, permissions, vendorId },
      { Cookie: cookie },
    );

    // const response = await fetch(`${import.meta.env.VITE_API_PATH}${API_PATH.roles}/create`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Cookie: cookie,
    //   },
    //   body: JSON.stringify({
    //     name,
    //     description,
    //     permissions,
    //     vendorId,
    //   }),
    // });

    // const result = await response.json();

    // if (!response.ok) {
    //   throw new Error(result.error || "Failed to create role");
    // }

    // return result.data;
  },

  /**
   * Update role
   */
  updateRole: async ({ cookie, id, name, description, permissions, vendorId }: IUpdateRoleParams) => {
    const qs = vendorId ? `?vendorId=${vendorId}` : "";
    return HTTPService.getInstance().put(
      `${API_PATH.roles}/${id}${qs}`,
      { name, description, permissions },
      { Cookie: cookie },
    );
    // const response = await fetch(`${import.meta.env.VITE_API_PATH}${API_PATH.roles}/${id}`, {
    //   method: "PUT",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Cookie: cookie,
    //   },
    //   body: JSON.stringify({
    //     name,
    //     description,
    //     permissions,
    //   }),
    // });

    // const result = await response.json();

    // if (!response.ok) {
    //   throw new Error(result.error || "Failed to update role");
    // }

    // return result.data;
  },

  /**
   * Delete role
   */
  deleteRole: async ({ cookie, id }: IDeleteRoleParams) => {
    return HTTPService.getInstance().delete(`${API_PATH.roles}/${id}`, { Cookie: cookie });
    // const response = await fetch(`${import.meta.env.VITE_API_PATH}${API_PATH.roles}/${id}`, {
    //   method: "DELETE",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Cookie: cookie,
    //   },
    // });

    // const result = await response.json();

    // if (!response.ok) {
    //   throw new Error(result.error || "Failed to delete role");
    // }

    // return result.data;
  },
};
