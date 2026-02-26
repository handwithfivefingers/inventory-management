import { HTTPService } from "~/http";
import { IRole } from "~/types/user";

const API_PATH = {
  roles: "/roles",
};

export const roleService = {
  getRoles: () => {
    return HTTPService.getInstance().get<IRole[]>(API_PATH.roles);
  },

  getRoleById: (id: number) => {
    return HTTPService.getInstance().get<IRole>(`${API_PATH.roles}/${id}`);
  },

  createRole: (data: { name: string; description?: string; permissions?: any[] }) => {
    return HTTPService.getInstance().post(API_PATH.roles + "/create", data);
  },

  updateRole: (id: number, data: { name: string; description?: string; permissions?: any[] }) => {
    return HTTPService.getInstance().put(`${API_PATH.roles}/${id}`, data);
  },

  deleteRole: (id: number) => {
    return HTTPService.getInstance().delete(`${API_PATH.roles}/${id}`);
  },

  assignRoleToUser: (userId: number, roleId: number) => {
    return HTTPService.getInstance().post(API_PATH.roles + "/assign", { userId, roleId });
  },
};
