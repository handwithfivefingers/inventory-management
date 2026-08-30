import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { roleService } from "~/action.server/role.service";
import { CardItem } from "~/components/card-item";
import { Divider } from "~/components/divider";
import { ErrorComponent } from "~/components/error-component";
import { CheckboxInput } from "~/components/form/checkbox-input";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { MODULES } from "~/constants/modules";
import { useSubmitPromise } from "~/hooks";
import { parseCookieFromRequest } from "~/sessions";

const MODULES_FOR_EDITOR = MODULES.map((module) => ({ key: module.key, label: module.label }));

const roleSchema = z.object({
  name: z.string().min(1, "Tên vai trò là bắt buộc"),
  permissions: z.record(
    z.object({
      C: z.boolean(),
      R: z.boolean(),
      U: z.boolean(),
      D: z.boolean(),
    }),
  ),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface IPermissionMatrix {
  [module: string]: { C: boolean; R: boolean; U: boolean; D: boolean };
}

export const meta: MetaFunction = () => {
  return [{ title: "Tạo vai trò mới" }, { name: "description", content: "Thiết lập vai trò mới với các quyền hạn" }];
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  try {
    const formData = await request.formData();
    const raw = formData.get("data") as string;
    if (!raw) return json({ error: "Missing data" }, { status: 400 });
    const parsed: RoleFormValues = JSON.parse(raw);
    const permissions = Object.entries(parsed.permissions || {}).map(([name, v]) => ({
      name,
      C: !!v.C,
      R: !!v.R,
      U: !!v.U,
      D: !!v.D,
    }));
    const result = await roleService.createRole({
      cookie,
      name: parsed.name,
      description: parsed.name,
      permissions,
      vendorId,
    });
    if ((result as any).status === 200 || (result as any).status === undefined) {
      return redirect("/setting/role");
    }
    return result;
  } catch (error: any) {
    return json({ error: error.message || "Tạo vai trò thất bại", success: false }, { status: 400 });
  }
};

export default function RoleAdd() {
  const navigate = useNavigate();
  const { submit, isLoading } = useSubmitPromise();

  const getDefaultMatrix = (): IPermissionMatrix => {
    const matrix: IPermissionMatrix = {};
    MODULES_FOR_EDITOR.forEach((module) => {
      matrix[module.key] = { C: false, R: false, U: false, D: false };
    });
    return matrix;
  };

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      permissions: getDefaultMatrix(),
    },
  });

  const watchedPermissions = useWatch({ control: form.control, name: "permissions" }) as IPermissionMatrix | undefined;

  const isModuleChecked = (moduleKey: string) => {
    const perms = watchedPermissions?.[moduleKey] ?? form.getValues("permissions")?.[moduleKey];
    return !!perms && perms.C && perms.R && perms.U && perms.D;
  };

  const handleSelectAllModule = (moduleKey: string) => {
    const checked = !isModuleChecked(moduleKey);
    form.setValue(
      `permissions.${moduleKey}` as any,
      { C: checked, R: checked, U: checked, D: checked },
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const onSubmit = async (values: RoleFormValues) => {
    await submit({ data: JSON.stringify(values) }, { method: "POST" });
  };

  const handleError = (errors: any) => {
    console.log("validation errors", errors);
  };

  return (
    <FormProvider {...form}>
      <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit, handleError)}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Tạo vai trò mới</h2>
            <p className="text-sm text-gray-600">Thiết lập vai trò mới với các quyền hạn</p>
          </div>
          <TMButton variant="light" size="sm" type="button" onClick={() => navigate("/setting/role")}>
            <Icon name="x" className="w-4 h-4" />
          </TMButton>
        </div>

        <div className="flex gap-4">
          <div className="w-64 flex-shrink-0 py-4">
            <h3 className="text-xl font-bold text-gray-800">Thông tin vai trò</h3>
            <Divider />
            <div className="flex flex-col gap-4">
              <FormControl name="name">
                <TextInput label="Tên vai trò" placeholder="Nhập tên vai trò (VD: Admin, Manager...)" required />
              </FormControl>
              <div className="p-3 bg-indigo-50 rounded-md">
                <h4 className="text-sm font-semibold text-indigo-800 mb-2">Ghi chú:</h4>
                <ul className="text-xs text-indigo-700 space-y-1">
                  <li>
                    • <strong>C</strong>: Tạo mới
                  </li>
                  <li>
                    • <strong>R</strong>: Xem danh sách
                  </li>
                  <li>
                    • <strong>U</strong>: Chỉnh sửa
                  </li>
                  <li>
                    • <strong>D</strong>: Xóa
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <CardItem title="Phân quyền chi tiết" className="p-4 overflow-hidden">
              <div className="overflow-x-auto">
                <TMTable
                  scrollable
                  data={MODULES_FOR_EDITOR}
                  rowKey="key"
                  columns={[
                    {
                      title: "Module",
                      dataIndex: "module",
                      render: (record) => <span className="font-medium text-gray-800">{record.label}</span>,
                    },
                    {
                      title: <span className="text-primary font-bold">Tạo (C)</span>,
                      dataIndex: "module",
                      render: (record) => (
                        <FormControl name={`permissions.${record.key}.C`}>
                          {(field) => (
                            <CheckboxInput
                              value={!!field.value}
                              onChange={(e: any) => field.onChange(e?.target ? e.target.checked : e)}
                            />
                          )}
                        </FormControl>
                      ),
                    },
                    {
                      title: <span className="text-blue-600 font-bold">Xem (R)</span>,
                      dataIndex: "module",
                      render: (record) => (
                        <FormControl name={`permissions.${record.key}.R`}>
                          {(field) => (
                            <CheckboxInput
                              value={!!field.value}
                              onChange={(e: any) => field.onChange(e?.target ? e.target.checked : e)}
                            />
                          )}
                        </FormControl>
                      ),
                    },
                    {
                      title: <span className="text-orange-600 font-bold">Sửa (U)</span>,
                      dataIndex: "module",
                      render: (record) => (
                        <FormControl name={`permissions.${record.key}.U`}>
                          {(field) => (
                            <CheckboxInput
                              value={!!field.value}
                              onChange={(e: any) => field.onChange(e?.target ? e.target.checked : e)}
                            />
                          )}
                        </FormControl>
                      ),
                    },
                    {
                      title: <span className="text-red-600 font-bold">Xóa (D)</span>,
                      dataIndex: "module",
                      render: (record) => (
                        <FormControl name={`permissions.${record.key}.D`}>
                          {(field) => (
                            <CheckboxInput
                              value={!!field.value}
                              onChange={(e: any) => field.onChange(e?.target ? e.target.checked : e)}
                            />
                          )}
                        </FormControl>
                      ),
                    },
                    {
                      title: "Thao tác",
                      dataIndex: "action",
                      render: (record) => (
                        <TMButton type="button" onClick={() => handleSelectAllModule(record.key)} size="sm">
                          {!isModuleChecked(record.key) ? "Select all" : "Unselect"}
                        </TMButton>
                      ),
                    },
                  ]}
                />
              </div>
            </CardItem>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <TMButton variant="light" size="sm" type="button" onClick={() => navigate("/setting/role")}>
            Hủy
          </TMButton>
          <TMButton type="submit" size="sm" loading={isLoading}>
            <Icon name="save" fontSize={16} />
            <span>Lưu vai trò</span>
          </TMButton>
        </div>
      </form>
    </FormProvider>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
