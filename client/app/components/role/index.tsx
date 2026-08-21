import { useEffect, useState } from "react";
import { useFetcher, useRevalidator } from "@remix-run/react";
import { CardItem } from "~/components/card-item";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { usePermission, useIsAdmin } from "~/hooks/use-permission";
import { PermissionGuard } from "~/components/permission-guard";
import { RoleEditor } from "./role-editor";
import { useSubmitPromise } from "~/hooks";
import { IRole, IPermission } from "~/types/user";
import { toast } from "~/components/notification";

const MODULES = [
  { key: "product", label: "Sản phẩm" },
  { key: "order", label: "Đơn hàng" },
  { key: "warehouse", label: "Kho bãi" },
  { key: "vendor", label: "Nhà cung cấp" },
  { key: "financial", label: "Tài chính" },
  { key: "category", label: "Danh mục" },
  { key: "tag", label: "Thẻ" },
  { key: "unit", label: "Đơn vị tính" },
  { key: "import-order", label: "Nhập hàng" },
  { key: "staff", label: "Nhân viên" },
  { key: "shift", label: "Chốt ca" },
  { key: "user", label: "Người dùng" },
  { key: "role", label: "Vai trò" },
];

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
  const fetcher = useSubmitPromise<IRoleFetcherData>();
  const revalidator = useRevalidator();

  const [roles, setRoles] = useState<IRole[]>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<IRole | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const canManageRoles = usePermission("C", "role") || useIsAdmin();
  const canViewRoles = usePermission("R", "role") || useIsAdmin();

  // Revalidate loader data after mutations
  useEffect(() => {
    if (fetcher.data?.success && !fetcher.isLoading) {
      revalidator.revalidate();
    }
  }, [fetcher.data, fetcher.isLoading, revalidator]);

  // Handle fetcher data changes
  useEffect(() => {
    if (fetcher.data && !fetcher.isLoading) {
      if (fetcher.data.error) {
        toast.danger({
          title: "Lỗi",
          message: fetcher.data.error,
        });
      } else if (fetcher.data.success) {
        toast.success({
          title: "Thành công",
          message: fetcher.data.message || "Thao tác thành công",
        });
      }
    }
  }, [fetcher.data, fetcher.isLoading]);

  const handleCreateRole = () => {
    setSelectedRole(null);
    setIsCreating(true);
  };

  const handleEditRole = (role: IRole) => {
    setSelectedRole(role);
    setIsEditing(true);
  };

  const handleDeleteRole = (roleId: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa vai trò này?")) {
      const formData = new FormData();
      formData.append("_action", "delete");
      formData.append("id", roleId.toString());
      fetcher.submit(formData, { method: "POST" });
    }
  };

  const handleSaveRole = (roleData: IRole) => {
    const formData = new FormData();
    formData.append("_action", isCreating ? "create" : "update");

    if (!isCreating) {
      formData.append("id", roleData.id.toString());
    }

    formData.append("name", roleData.name);
    formData.append("description", roleData.name || "");
    formData.append("permissions", JSON.stringify(roleData.permissions || []));

    fetcher.submit(formData, { method: "POST" });

    // Close editor immediately for better UX
    setIsCreating(false);
    setIsEditing(false);
    setSelectedRole(null);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setSelectedRole(null);
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

  // Show editor when creating or editing
  if (isCreating || isEditing) {
    return <RoleEditor role={selectedRole} modules={MODULES} onSave={handleSaveRole} onCancel={handleCancel} />;
  }

  // Filter roles
  const filteredRoles = roles.filter((role) => role.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Quản lý vai trò</h2>
          <p className="text-sm text-gray-600">Quản lý các vai trò và phân quyền trong hệ thống</p>
        </div>
        <PermissionGuard permission="C" module="role">
          <TMButton onClick={handleCreateRole}>
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

      {/* Loading State */}
      {fetcher.isLoading && !roles.length ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Table */}
          <CardItem title="" className="p-0 overflow-hidden">
            <TMTable
              columns={[
                {
                  title: "STT",
                  dataIndex: "id",
                  width: 60,
                  render: (record, no?: number) => no && no + 1,
                },
                {
                  title: "Tên vai trò",
                  dataIndex: "name",
                  render: (record: IRole) => (
                    <div className="flex items-center gap-2">
                      <Icon
                        name={record.name.toLowerCase() === "admin" ? "shield" : "user"}
                        className="w-5 h-5 text-indigo-600"
                      />
                      <span className="font-medium">{record.name}</span>
                    </div>
                  ),
                },
                {
                  title: "Số quyền",
                  dataIndex: "permissions",
                  width: 120,
                  render: (permissions: IPermission[]) => (
                    <span className="text-sm text-gray-600">{permissions?.length || 0} quyền</span>
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
                  width: 150,
                  render: (record: IRole) => (
                    <div className="flex gap-2">
                      <PermissionGuard permission="U" module="role">
                        <button
                          onClick={() => handleEditRole(record)}
                          className="text-indigo-600 hover:text-indigo-800 p-1"
                          title="Sửa"
                        >
                          <Icon name="edit-2" className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard permission="D" module="role">
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

          {/* Footer */}
          <div className="text-sm text-gray-500">
            Hiển thị {filteredRoles.length} trong tổng số {roles.length} vai trò
          </div>
        </>
      )}
    </div>
  );
};
