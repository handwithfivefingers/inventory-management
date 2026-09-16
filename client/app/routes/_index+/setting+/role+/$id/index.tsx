import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useActionData, useLoaderData, useNavigate } from "@remix-run/react";
import { useEffect, useMemo } from "react";
import { FormProvider, useForm, useWatch, type Path } from "react-hook-form";
import { roleService } from "~/action.server/role.service";
import { CardItem } from "~/components/card-item";
import { Divider } from "~/components/divider";
import { ErrorComponent } from "~/components/error-component";
import { CheckboxInput } from "~/components/form/checkbox-input";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import PermissionGuard from "~/components/permission-guard";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { MODULES } from "~/constants/modules";
import { useSubmitPromise } from "~/hooks";
import {
  flatPermissionsToMatrix,
  isModuleFullyGranted,
  matrixToGrants,
  matrixToModuleNames,
  roleFormSchema,
  type PermissionMatrix,
  type RoleFormValues,
} from "~/libs/role-permission";
import { parseCookieFromRequest } from "~/sessions";
import type { IRole } from "~/types/user";

const MODULES_FOR_EDITOR = MODULES.map((module) => ({ key: module.key, label: module.label }));

interface RoleDetailLoaderData {
  role: IRole;
  vendorId: string | number;
  unknownModules: string[];
}

interface RoleUpdateActionData {
  success: boolean;
  error?: string;
  fieldErrors?: Array<{ field: string; message: string }>;
}

export const meta: MetaFunction = () => {
  return [{ title: "Chỉnh sửa vai trò" }, { name: "description", content: "Cập nhật vai trò và phân quyền" }];
};

/**
 * GET /setting/role/:id -> GET /roles/:id?vendorId=...
 * Throws a 404 Response when the id is invalid or the role does not exist.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { cookie, vendorId } = await parseCookieFromRequest(request);

  const id = Number(params.id);
  if (!params.id || !Number.isInteger(id) || id < 1) {
    throw new Response("Vai trò không tồn tại", { status: 404 });
  }

  try {
    const response = await roleService.getRoleById(id);
    if (response.status !== 200) {
      throw new Response(response.message || "Không thể tải vai trò", { status: 404 });
    }
    const payload = response.data as { data: IRole } | undefined;
    if (!payload?.data) {
      throw new Response("Vai trò không tồn tại", { status: 404 });
    }
    const { unknownModules } = flatPermissionsToMatrix(payload.data.permissions);
    return json<RoleDetailLoaderData>({ role: payload.data, vendorId, unknownModules });
  } catch (error) {
    if (error instanceof Response) throw error;
    const message = error instanceof Error ? error.message : "Không thể tải vai trò";
    throw new Response(message, { status: 404 });
  }
}

/**
 * POST /setting/role/:id (form field "data", JSON) -> PUT /roles/:id.
 * Only backend-supported fields are forwarded: { name, description, vendorId, permissions }.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const { cookie, vendorId } = await parseCookieFromRequest(request);

  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return json<RoleUpdateActionData>({ success: false, error: "ID vai trò không hợp lệ" }, { status: 400 });
  }

  let raw: string | null;
  try {
    const formData = await request.formData();
    raw = formData.get("data") as string | null;
  } catch {
    return json<RoleUpdateActionData>({ success: false, error: "Không đọc được dữ liệu form" }, { status: 400 });
  }
  if (!raw) {
    return json<RoleUpdateActionData>({ success: false, error: "Thiếu dữ liệu vai trò" }, { status: 400 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return json<RoleUpdateActionData>({ success: false, error: "Dữ liệu JSON không hợp lệ" }, { status: 400 });
  }

  const validation = roleFormSchema.safeParse(parsedJson);
  if (!validation.success) {
    return json<RoleUpdateActionData>(
      {
        success: false,
        error: "Dữ liệu không hợp lệ, vui lòng kiểm tra lại",
        fieldErrors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const values = validation.data;
  try {
    const response = await roleService.updateRole({
      id,
      name: values.name,
      description: values.description || values.name,
      permissions: matrixToModuleNames(values.permissions),
      permissionGrants: matrixToGrants(values.permissions),
    });
    if (response.status !== 200) {
      return json<RoleUpdateActionData>(
        { success: false, error: response.message || "Cập nhật vai trò thất bại" },
        { status: response.status || 400 },
      );
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "Cập nhật vai trò thất bại";
    return json<RoleUpdateActionData>({ success: false, error: message }, { status: 400 });
  }
  return redirect("/setting/role");
}

export default function RoleId() {
  const { role, unknownModules } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { submit, isLoading } = useSubmitPromise<RoleUpdateActionData>();
  const actionData = useActionData<typeof action>();

  // Backend returns flat catalog rows [{ name, method }]; group them into the matrix.
  const initialMatrix = useMemo<PermissionMatrix>(() => {
    return flatPermissionsToMatrix(role.permissions).matrix;
  }, [role.permissions]);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role.name,
      description: role.description ?? "",
      permissions: initialMatrix,
    },
  });

  // Re-populate safely when navigating between role ids (remix reuses the component).
  useEffect(() => {
    form.reset({
      name: role.name,
      description: role.description ?? "",
      permissions: flatPermissionsToMatrix(role.permissions).matrix,
    });
  }, [form, role.id, role.name, role.description, role.permissions]);

  const watchedPermissions = useWatch({ control: form.control, name: "permissions" }) as PermissionMatrix | undefined;

  const serverError =
    actionData && typeof actionData === "object" && "error" in actionData
      ? (actionData as RoleUpdateActionData).error ?? null
      : null;

  useEffect(() => {
    if (actionData && typeof actionData === "object" && "success" in actionData) {
      const data = actionData as RoleUpdateActionData;
      if (data.success) navigate("/setting/role");
      for (const fieldError of data.fieldErrors ?? []) {
        form.setError(fieldError.field as Path<RoleFormValues>, { message: fieldError.message });
      }
    }
  }, [actionData, form, navigate]);

  const handleSelectAllModule = (moduleKey: string) => {
    const checked = !isModuleFullyGranted(watchedPermissions, moduleKey);
    form.setValue(
      `permissions.${moduleKey}` as Path<RoleFormValues>,
      {
        C: checked,
        R: checked,
        U: checked,
        D: checked,
      } as RoleFormValues["permissions"][string],
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const onSubmit = async (values: RoleFormValues) => {
    const response = await submit<RoleUpdateActionData>({ data: JSON.stringify(values) }, { method: "POST" });
    if (response?.success) navigate("/setting/role");
  };

  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-5xl w-full mx-auto">
        <FormProvider {...form}>
          <form className="flex flex-col gap-5 mt-2" onSubmit={form.handleSubmit(onSubmit)}>
            <CardItem
              title={
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                      <Icon name="shield" fontSize={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                        Chỉnh sửa vai trò
                      </h2>
                      <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                        Cập nhật thông tin vai trò và phân quyền
                      </p>
                    </div>
                  </div>
                  <TMButton variant="ghost" size="sm" type="button" onClick={() => navigate("/setting/role")}>
                    <Icon name="x" className="w-4 h-4" />
                  </TMButton>
                </div>
              }
              className="p-5 sm:p-6"
            >
              {serverError ? (
                <p role="alert" className="text-sm text-rose-600 bg-rose-50 rounded-md px-3 py-2">
                  {serverError}
                </p>
              ) : null}
              {unknownModules.length > 0 ? (
                <p role="note" className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
                  Vai trò chứa quyền của module lạ ({unknownModules.join(", ")}) - các quyền này được giữ nguyên khi
                  lưu.
                </p>
              ) : null}
              <div className="flex gap-4 flex-col lg:flex-row mt-2">
                <div className="w-full lg:w-64 flex-shrink-0 py-2">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Thông tin vai trò</h3>
                  <Divider />
                  <div className="flex flex-col gap-4">
                    <FormControl name="name">
                      <TextInput
                        label="Tên vai trò"
                        placeholder="Nhập tên vai trò (VD: Admin, Manager...)"
                        required
                        prefix={<Icon name="shield" fontSize={16} className="text-slate-400" />}
                      />
                    </FormControl>
                    <FormControl name="description">
                      <TextInput label="Mô tả" placeholder="Mô tả ngắn về vai trò" multiline rows={3} />
                    </FormControl>
                    <div className="text-xs text-gray-500">
                      <p>ID: {role.id}</p>
                    </div>
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
                                    onChange={(event: unknown) =>
                                      field.onChange(
                                        typeof event === "object" && event !== null && "target" in event
                                          ? (event as { target: { checked: boolean } }).target.checked
                                          : event,
                                      )
                                    }
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
                                    onChange={(event: unknown) =>
                                      field.onChange(
                                        typeof event === "object" && event !== null && "target" in event
                                          ? (event as { target: { checked: boolean } }).target.checked
                                          : event,
                                      )
                                    }
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
                                    onChange={(event: unknown) =>
                                      field.onChange(
                                        typeof event === "object" && event !== null && "target" in event
                                          ? (event as { target: { checked: boolean } }).target.checked
                                          : event,
                                      )
                                    }
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
                                    onChange={(event: unknown) =>
                                      field.onChange(
                                        typeof event === "object" && event !== null && "target" in event
                                          ? (event as { target: { checked: boolean } }).target.checked
                                          : event,
                                      )
                                    }
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
                                {!isModuleFullyGranted(watchedPermissions, record.key) ? "Select all" : "Unselect"}
                              </TMButton>
                            ),
                          },
                        ]}
                      />
                    </div>
                  </CardItem>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
                <TMButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  component={Link}
                  to="/setting/role"
                  onClick={() => navigate("/setting/role")}
                >
                  Hủy
                </TMButton>
                <PermissionGuard permission="UPDATE" module="role" requireAdmin>
                  <TMButton htmlType="submit" size="sm" loading={isLoading}>
                    <Icon name="save" fontSize={16} />
                    <span>Lưu vai trò</span>
                  </TMButton>
                </PermissionGuard>
              </div>
            </CardItem>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
