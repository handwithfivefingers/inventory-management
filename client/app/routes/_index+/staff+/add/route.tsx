import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import dayjs from "dayjs";
import { FieldErrors, FormProvider, useForm } from "react-hook-form";
import { Link, useLoaderData } from "@remix-run/react";
import { roleService } from "~/action.server/role.service";
import { staffService } from "~/action.server/staff.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { CheckboxInput } from "~/components/form/checkbox-input";
import { DatePicker } from "~/components/form/date-picker";
import { FormControl } from "~/components/form/form-control";
import { NumberInput } from "~/components/form/number-input";
import { SelectInput } from "~/components/form/select-input";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { StaffSchema, staffSchema } from "~/constants/schema/staff";
import { useSubmitPromise } from "~/hooks";
import { useTranslation } from "~/i18n";
import { parseCookieFromRequest } from "~/sessions";

export const meta: MetaFunction = () => {
  return [{ title: "Thêm nhân viên" }, { name: "description", content: "Thêm nhân viên" }];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { vendorId, cookie } = await parseCookieFromRequest(request);
  try {
    const roleResponse = await roleService.getRoles({ cookie, vendorId } as any);
    return { roles: roleResponse.data?.data };
  } catch {
    return { roles: [] };
  }
};

export default function StaffAdd() {
  const { t } = useTranslation();
  const { submit, isLoading } = useSubmitPromise();
  const { roles } = useLoaderData<typeof loader>();
  const form = useForm<StaffSchema>({
    defaultValues: {
      fullName: "Truyenmv",
      gender: "male",
      phone: "0123456789",
      email: "hdme1995@gmail.com",
      salary: 0,
      hireDate: dayjs().toString(),
      status: "active",
      address: "",
      createAccount: false,
      password: "",
      accountEmail: "",
    },
    resolver: staffSchema,
  });

  const createAccount = form.watch("createAccount");

  const onSubmit = async (values: StaffSchema) => {
    try {
      const response = await submit<{ status: number }>(
        { data: JSON.stringify(values) },
        { method: "POST", action: "/staff/add" },
      );
      console.log("response", response);
      if (response.status !== 200) throw response;
      toast.success({ title: "Thành công", message: "Thêm nhân viên thành công" });
    } catch (error) {
      toast.danger({ title: "Lỗi", message: (error as any).message });
    }
  };

  const onError = (errors: FieldErrors<StaffSchema>) => {};

  console.log("roles", roles);
  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="user-plus" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">{t("staff.add")}</h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">Thêm nhân viên mới</p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onError)} className="flex flex-col gap-5 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormControl name="fullName">
                  {(field) => (
                    <TextInput
                      required
                      label={t("staff.fullName")}
                      placeholder={t("staff.fullNamePlaceholder", { defaultValue: "" })}
                      prefix={<Icon name="user" fontSize={16} className="text-slate-400" />}
                      {...field}
                    />
                  )}
                </FormControl>
                <FormControl name="phone">
                  {(field) => (
                    <TextInput
                      label={t("staff.phone")}
                      placeholder={t("staff.phonePlaceholder", { defaultValue: "" })}
                      prefix={<Icon name="phone" fontSize={16} className="text-slate-400" />}
                      {...field}
                    />
                  )}
                </FormControl>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormControl name="email">
                  {(field) => (
                    <TextInput
                      label={t("staff.email")}
                      placeholder={t("staff.emailPlaceholder", { defaultValue: "" })}
                      prefix={<Icon name="mail" fontSize={16} className="text-slate-400" />}
                      {...field}
                    />
                  )}
                </FormControl>
                <FormControl name="gender">
                  {(field) => (
                    <SelectInput
                      label={t("staff.gender")}
                      options={[
                        { label: "Male", value: "male" },
                        { label: "Female", value: "female" },
                        { label: "Other", value: "other" },
                      ]}
                      {...field}
                      onSelect={(v) => field.onChange(v)}
                    />
                  )}
                </FormControl>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormControl name="roleId">
                  {(field) => (
                    <SelectInput
                      required
                      label={t("staff.position") as string}
                      placeholder={t("staff.selectRole") as string}
                      options={(roles as any[]).map((r: any) => ({
                        label: `${r.name}${r.isSystem ? " (System)" : ""}${r.vendorId ? " - Vendor" : " - Global"}`,
                        value: String(r.id),
                      }))}
                      {...field}
                      onSelect={(v) => field.onChange(v)}
                    />
                  )}
                </FormControl>
                <FormControl name="status">
                  {(field) => (
                    <SelectInput
                      required
                      label={t("staff.status")}
                      options={[
                        { label: "Active", value: "active" },
                        { label: "Inactive", value: "inactive" },
                      ]}
                      {...field}
                      onSelect={(v) => field.onChange(v)}
                    />
                  )}
                </FormControl>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormControl name="salary">
                  {(field) => (
                    <NumberInput
                      label={t("staff.salary")}
                      value={field.value as any}
                      onValueChange={(v) => field.onChange(v.value)}
                    />
                  )}
                </FormControl>
                <FormControl name="hireDate">
                  {(field) => <DatePicker label={t("staff.hireDate")} {...field} />}
                </FormControl>
              </div>
              <FormControl name="address">
                {(field) => (
                  <TextInput
                    label={t("staff.address")}
                    placeholder={t("staff.addressPlaceholder", { defaultValue: "" })}
                    multiline
                    rows={2}
                    prefix={<Icon name="map-pin" fontSize={16} className="text-slate-400" />}
                    {...field}
                  />
                )}
              </FormControl>
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-900/10 dark:border-amber-800 p-4 flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-300">
                  <Icon name="user-plus" fontSize={16} />
                </div>
                <div className="flex-1">
                  <FormControl name="createAccount">
                    {(field) => (
                      <CheckboxInput
                        label={t("staff.createAccount") as string}
                        value={field.value as boolean}
                        onChange={(e: any) => field.onChange(e.target.checked)}
                      />
                    )}
                  </FormControl>
                  {createAccount && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                      <FormControl name="accountEmail">
                        {(field) => (
                          <TextInput
                            label={`${t("staff.email")} (${t("staff.loginEmail")})`}
                            placeholder={form.getValues("email") || "staff@example.com"}
                            prefix={<Icon name="mail" fontSize={16} className="text-slate-400" />}
                            {...field}
                          />
                        )}
                      </FormControl>
                      <FormControl name="password">
                        {(field) => (
                          <TextInput label={t("staff.password")} type="password" placeholder="••••••••" {...field} />
                        )}
                      </FormControl>
                    </div>
                  )}
                  {createAccount && <p className="text-xs text-slate-500 mt-1">{t("staff.loginEmailHint")}</p>}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
                <TMButton variant="ghost" size="sm" component={Link} to="/staff" type="button">
                  {t("common.cancel")}
                </TMButton>
                <TMButton htmlType="submit" size="sm" loading={isLoading}>
                  <Icon name="save" fontSize={16} />
                  {t("common.save")}
                </TMButton>
              </div>
          </form>
        </FormProvider>
      </CardItem>
      </div>
    </div>
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { warehouseId, cookie, vendorId } = await parseCookieFromRequest(request);
    const form = await request.formData();
    const data = form.get("data") as string;
    const resp = await staffService.create({ ...JSON.parse(data), warehouseId, vendorId, cookie });
    return resp;
  } catch (error) {
    return { status: 400, error: (error as any).message };
  }
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}
