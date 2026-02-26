import { useState } from "react";
import { TMButton } from "~/components/tm-button";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { cn } from "~/libs/utils";
import { IRole, IPermission } from "~/types/user";
import { CardItem } from "~/components/card-item";

interface IModule {
  key: string;
  label: string;
}

interface IRoleEditorProps {
  role?: IRole | null;
  modules: IModule[];
  onSave: (role: IRole) => void;
  onCancel: () => void;
}

interface IPermissionMatrix {
  [module: string]: {
    C: boolean;
    R: boolean;
    U: boolean;
    D: boolean;
  };
}

export const RoleEditor = ({ role, modules, onSave, onCancel }: IRoleEditorProps) => {
  const [roleName, setRoleName] = useState(role?.name || "");
  const [permissionMatrix, setPermissionMatrix] = useState<IPermissionMatrix>(() => {
    // Initialize from existing role or default to all false
    const matrix: IPermissionMatrix = {};
    modules.forEach((module) => {
      const existingPerm = role?.permissions?.find((p) => p.name === module.key);
      matrix[module.key] = {
        C: existingPerm?.C || false,
        R: existingPerm?.R || false,
        U: existingPerm?.U || false,
        D: existingPerm?.D || false,
      };
    });
    return matrix;
  });

  const handlePermissionChange = (
    moduleKey: string,
    action: keyof IPermissionMatrix[string],
    value: boolean
  ) => {
    setPermissionMatrix((prev) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [action]: value,
      },
    }));
  };

  const handleSelectAllModule = (moduleKey: string, checked: boolean) => {
    setPermissionMatrix((prev) => ({
      ...prev,
      [moduleKey]: {
        C: checked,
        R: checked,
        U: checked,
        D: checked,
      },
    }));
  };

  const handleSelectAllActions = (action: keyof IPermissionMatrix[string], checked: boolean) => {
    const newMatrix = { ...permissionMatrix };
    modules.forEach((module) => {
      newMatrix[module.key] = {
        ...newMatrix[module.key],
        [action]: checked,
      };
    });
    setPermissionMatrix(newMatrix);
  };

  const handleSave = () => {
    if (!roleName.trim()) {
      alert("Vui lòng nhập tên vai trò");
      return;
    }

    // Convert matrix to permissions array
    const permissions: IPermission[] = [];
    let permId = 1;
    modules.forEach((module) => {
      const perms = permissionMatrix[module.key];
      if (perms.C || perms.R || perms.U || perms.D) {
        permissions.push({
          id: permId++,
          name: module.key,
          C: perms.C,
          R: perms.R,
          U: perms.U,
          D: perms.D,
        });
      }
    });

    onSave({
      id: role?.id || 0,
      name: roleName,
      permissions,
    });
  };

  const isModuleChecked = (moduleKey: string) => {
    const perms = permissionMatrix[moduleKey];
    return perms.C && perms.R && perms.U && perms.D;
  };

  const isActionChecked = (action: keyof IPermissionMatrix[string]) => {
    return modules.every((module) => permissionMatrix[module.key][action]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {role ? "Chỉnh sửa vai trò" : "Tạo vai trò mới"}
          </h2>
          <p className="text-sm text-gray-600">
            {role ? "Cập nhật thông tin vai trò và phân quyền" : "Thiết lập vai trò mới với các quyền hạn"}
          </p>
        </div>
        <TMButton variant="light" onClick={onCancel}>
          <Icon name="x" className="w-4 h-4" />
        </TMButton>
      </div>

      <div className="flex gap-4">
        <div className="w-64 flex-shrink-0">
          <CardItem title="Thông tin vai trò" className="p-4">
            <div className="flex flex-col gap-4">
              <TextInput
                label="Tên vai trò"
                placeholder="Nhập tên vai trò (VD: Admin, Manager...)"
                value={roleName}
                onChange={(e: any) => setRoleName(e.target.value)}
              />

              <div className="p-3 bg-indigo-50 rounded-md">
                <h4 className="text-sm font-semibold text-indigo-800 mb-2">Ghi chú:</h4>
                <ul className="text-xs text-indigo-700 space-y-1">
                  <li>• <strong>C</strong>: Tạo mới</li>
                  <li>• <strong>R</strong>: Xem danh sách</li>
                  <li>• <strong>U</strong>: Chỉnh sửa</li>
                  <li>• <strong>D</strong>: Xóa</li>
                </ul>
              </div>

              {role && (
                <div className="text-xs text-gray-500">
                  <p>ID: {role.id}</p>
                </div>
              )}
            </div>
          </CardItem>
        </div>

        <div className="flex-1">
          <CardItem title="Phân quyền chi tiết" className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b sticky left-0 bg-gray-50 min-w-[200px]">
                      Module
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="checkbox"
                          checked={isActionChecked("C")}
                          onChange={(e) => handleSelectAllActions("C", e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-indigo-600 font-bold">Tạo (C)</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="checkbox"
                          checked={isActionChecked("R")}
                          onChange={(e) => handleSelectAllActions("R", e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-blue-600 font-bold">Xem (R)</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="checkbox"
                          checked={isActionChecked("U")}
                          onChange={(e) => handleSelectAllActions("U", e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-orange-600 font-bold">Sửa (U)</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="checkbox"
                          checked={isActionChecked("D")}
                          onChange={(e) => handleSelectAllActions("D", e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-red-600 font-bold">Xóa (D)</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((module, index) => (
                    <tr
                      key={module.key}
                      className={cn(
                        "hover:bg-gray-50 transition-colors",
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      )}
                    >
                      <td className="px-4 py-3 border-b sticky left-0 bg-inherit">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isModuleChecked(module.key)}
                            onChange={(e) => handleSelectAllModule(module.key, e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-medium text-gray-800">{module.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b text-center">
                        <input
                          type="checkbox"
                          checked={permissionMatrix[module.key].C}
                          onChange={(e) => handlePermissionChange(module.key, "C", e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 border-b text-center">
                        <input
                          type="checkbox"
                          checked={permissionMatrix[module.key].R}
                          onChange={(e) => handlePermissionChange(module.key, "R", e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 border-b text-center">
                        <input
                          type="checkbox"
                          checked={permissionMatrix[module.key].U}
                          onChange={(e) => handlePermissionChange(module.key, "U", e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 border-b text-center">
                        <input
                          type="checkbox"
                          checked={permissionMatrix[module.key].D}
                          onChange={(e) => handlePermissionChange(module.key, "D", e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 border-b text-center">
                        <button
                          onClick={() => handleSelectAllModule(module.key, true)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 mr-2"
                        >
                          Chọn tất cả
                        </button>
                        <button
                          onClick={() => handleSelectAllModule(module.key, false)}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          Bỏ chọn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardItem>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <TMButton variant="light" onClick={onCancel}>
          Hủy
        </TMButton>
        <TMButton onClick={handleSave}>
          <Icon name="save" className="w-4 h-4 mr-2" />
          Lưu vai trò
        </TMButton>
      </div>
    </div>
  );
};
