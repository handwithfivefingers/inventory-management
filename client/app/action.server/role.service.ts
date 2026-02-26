import { HTTPService } from "~/http";

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
}

interface IUpdateRoleParams extends ICreateRoleParams {
  id: number;
}

interface IDeleteRoleParams extends IRoleServiceParams {
  id: number;
}

export const roleService = {
  /**
   * Get all roles
   */
  getRoles: async ({ cookie }: IRoleServiceParams) => {
    const response = await fetch(`${import.meta.env.VITE_API_PATH}${API_PATH.roles}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || "Failed to fetch roles");
    }
    
    return result.data || [];
  },

  /**
   * Get role by ID
   */
  getRoleById: async ({ cookie, id }: IRoleServiceParams & { id: number }) => {
    const response = await fetch(`${import.meta.env.VITE_API_PATH}${API_PATH.roles}/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || "Failed to fetch role");
    }
    
    return result.data;
  },

  /**
   * Create new role
   */
  createRole: async ({ cookie, name, description, permissions }: ICreateRoleParams) => {
    const response = await fetch(`${import.meta.env.VITE_API_PATH}${API_PATH.roles}/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        name,
        description,
        permissions,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || "Failed to create role");
    }
    
    return result.data;
  },

  /**
   * Update role
   */
  updateRole: async ({ cookie, id, name, description, permissions }: IUpdateRoleParams) => {
    const response = await fetch(`${import.meta.env.VITE_API_PATH}${API_PATH.roles}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        name,
        description,
        permissions,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || "Failed to update role");
    }
    
    return result.data;
  },

  /**
   * Delete role
   */
  deleteRole: async ({ cookie, id }: IDeleteRoleParams) => {
    const response = await fetch(`${import.meta.env.VITE_API_PATH}${API_PATH.roles}/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || "Failed to delete role");
    }
    
    return result.data;
  },
};
