import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { roleService } from "~/action.server/role.service";
import { CardItem } from "~/components/card-item";
import { Divider } from "~/components/divider";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import PermissionGuard from "~/components/permission-guard";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { MODULE_ENUM, MODULES } from "~/constants/modules";
import { usePermission, useSubmitPromise } from "~/hooks";
import { parseCookieFromRequest } from "~/sessions";
import { IRole } from "~/types/user";

export const meta: MetaFunction = () => {
  return [
    { title: "Quản lý vai trò - Cài đặt" },
    { name: "description", content: "Quản lý các vai trò và phân quyền trong hệ thống" },
  ];
};

/**
 * GET /setting/role
 * Load all roles
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { cookie, vendorId } = await parseCookieFromRequest(request);
    const response = await roleService.getRoles({ cookie, vendorId });

    return response.data as { data: IRole[] };
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error.message || "Không thể tải danh sách vai trò",
      },
      { status: 400 },
    );
  }
}

/**
 * POST /setting/role
 * Handle role CRUD operations
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { cookie, vendorId } = await parseCookieFromRequest(request);
    const formData = await request.formData();
    const actionType = formData.get("_action");

    switch (actionType) {
      case "create": {
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const permissions = JSON.parse((formData.get("permissions") as string) || "[]");

        const result = await roleService.createRole({
          cookie,
          name,
          vendorId,
          description,
          permissions,
        });
        return result;
      }

      case "update": {
        const id = formData.get("id") as string;
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const permissions = JSON.parse((formData.get("permissions") as string) || "[]");

        const result = await roleService.updateRole({
          cookie,
          id: Number(id),
          name,
          description,
          permissions,
        });
        return result;
      }

      case "delete": {
        const id = formData.get("id") as string;

        await roleService.deleteRole({
          cookie,
          id: Number(id),
        });
        return { message: "Xóa thành cong", success: true };
      }

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    return Response.json(
      {
        error: error.message || "Thao tác thất bại",
        success: false,
      },
      { status: 400 },
    );
  }
}

export default function RoleManagementRoute() {
  const roles = useLoaderData<typeof loader>();
  const { submit, isLoading } = useSubmitPromise();
  const canViewRoles = usePermission("READ", MODULE_ENUM.role);

  const handleDeleteRole = (roleId: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa vai trò này?")) {
      const formData = new FormData();
      formData.append("_action", "delete");
      formData.append("id", roleId.toString());
      submit(formData, { method: "POST" });
    }
  };
  if (!canViewRoles) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Icon name="lock" className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">Không có quyền truy cập</h3>
          <p className="text-gray-500">Bạn không có quyền quản lý vai trò</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <CardItem
        title="Quản lý vai trò"
        className="flex flex-col w-full rounded-md dark:bg-slate-500 bg-white shadow-2xl shadow-slate-200 gap-2 dark:shadow-slate-600 p-5 sm:p-6 h-full"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Quản lý các vai trò và phân quyền trong hệ thống</p>
            <PermissionGuard permission="CREATE" module="role" requireAdmin>
              <TMButton component={Link} to="./add" size="sm">
                <Icon name="plus" className="w-4 h-4 mr-2" />
                Tạo vai trò mới
              </TMButton>
            </PermissionGuard>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1">
              <TextInput placeholder="Tìm kiếm vai trò..." />
            </div>
          </div>
          <Divider />
          <TMTable
            scrollable
            columns={[
              {
                title: "Tên vai trò",
                dataIndex: "name",
                render: (record: IRole) => (
                  <div className="flex items-center gap-2">
                    <Icon
                      name={record.name.toLowerCase() === "admin" ? "shield" : "user"}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium">{record.name}</span>
                  </div>
                ),
              },
              {
                title: "Số quyền",
                dataIndex: "permissions",
                width: 120,
                render: (record) => (
                  <span className="text-sm text-gray-600">{record?.permissions?.length || 0} quyền</span>
                ),
              },
              {
                title: "Mô tả",
                dataIndex: "description",
                render: (record: IRole) => (
                  <span className="text-sm text-gray-500">
                    {record.name.toLowerCase() === "admin" && "Quản trị viên cao cấp - Toàn quyền"}
                    {record.name.toLowerCase() === "manager" && "Quản lý - Quyền hạn chế"}
                    {record.name.toLowerCase() === "staff" && "Nhân viên - Quyền cơ bản"}
                  </span>
                ),
              },
              {
                title: "Thao tác",
                dataIndex: "actions",
                width: 120,
                render: (record: IRole) =>
                  !record?.isSystem && (
                    <div className="flex gap-2">
                      <PermissionGuard permission="UPDATE" module="role" requireAdmin>
                        <TMButton component={Link} to={`./${record.id}`} size="sm">
                          <Icon name="edit-2" className="w-4 h-4" />
                        </TMButton>
                      </PermissionGuard>
                      <PermissionGuard permission="DELETE" module="role" requireAdmin>
                        {record.name.toLowerCase() !== "admin" && (
                          <button
                            onClick={() => handleDeleteRole(record.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Xóa"
                          >
                            <Icon name="trash-2" className="w-4 h-4" />
                          </button>
                        )}
                      </PermissionGuard>
                    </div>
                  ),
              },
            ]}
            data={roles.data}
            rowKey="id"
          />
        </div>
      </CardItem>
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
