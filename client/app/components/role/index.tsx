import { Link } from "@remix-run/react";
import { useState } from "react";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { PermissionGuard } from "~/components/permission-guard";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { useIsAdmin, usePermission } from "~/hooks/use-permission";
import { IRole } from "~/types/user";

interface IRoleFetcherData {
  data?: {
    roles?: IRole[];
  };
  error?: string;
  success?: boolean;
  message?: string;
}

interface IRoleManagementProps {
  initialData?: IRole[];
}

export const RoleManagement = ({ initialData = [] }: IRoleManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const canViewRoles = usePermission("R", "role") || useIsAdmin();

  // Handle fetcher data changes
  // useEffect(() => {
  //   if (fetcher.data && !fetcher.isLoading) {
  //     if (fetcher.data.error) {
  //       toast.danger({
  //         title: "Lỗi",
  //         message: fetcher.data.error,
  //       });
  //     } else if (fetcher.data.success) {
  //       toast.success({
  //         title: "Thành công",
  //         message: fetcher.data.message || "Thao tác thành công",
  //       });
  //     }
  //   }
  // }, [fetcher.data, fetcher.isLoading]);

  const handleDeleteRole = (roleId: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa vai trò này?")) {
      const formData = new FormData();
      formData.append("_action", "delete");
      formData.append("id", roleId.toString());
      fetcher.submit(formData, { method: "POST" });
    }
  };

  // Permission check
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

  // Filter roles
  const filteredRoles = role.filter((role) => role.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
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
          <TextInput
            placeholder="Tìm kiếm vai trò..."
            value={searchTerm}
            onChange={(e: any) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <CardItem title="" className="p-0 overflow-hidden">
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
          data={filteredRoles}
          rowKey="id"
        />
      </CardItem>
    </div>
  );
};
