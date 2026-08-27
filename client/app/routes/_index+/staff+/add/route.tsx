import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import dayjs from "dayjs";
import { FieldErrors, FormProvider, useForm } from "react-hook-form";
import { useLoaderData } from "@remix-run/react";
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
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title={t("staff.add")} className="p-4">
        <FormProvider {...form}>
          <form className="grid grid-cols-2 gap-x-4 gap-2" onSubmit={form.handleSubmit(onSubmit, onError)}>
            <div className="col-span-1">
              <FormControl name="fullName">
                {(field) => <TextInput required label={t("staff.fullName")} {...field} />}
              </FormControl>
            </div>
            <div className="col-span-1">
              <FormControl name="phone">{(field) => <TextInput label={t("staff.phone")} {...field} />}</FormControl>
            </div>
            <div className="col-span-1">
              <FormControl name="email">{(field) => <TextInput label={t("staff.email")} {...field} />}</FormControl>
            </div>
            <div className="col-span-1">
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
            <div className="col-span-1">
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
              {/* <p className="text-xs text-slate-500 mt-1">{t("staff.roleHint") as string}</p> */}
            </div>
            <div className="col-span-1">
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
            <div className="col-span-1">
              <FormControl name="salary">
                {(field) => (
                  <NumberInput
                    label={t("staff.salary")}
                    value={field.value as any}
                    onValueChange={(v) => field.onChange(v.value)}
                  />
                )}
              </FormControl>
            </div>
            <div className="col-span-1">
              <FormControl name="hireDate">
                {(field) => <DatePicker label={t("staff.hireDate")} {...field} />}
              </FormControl>
            </div>
            <div className="col-span-2">
              <FormControl name="address">{(field) => <TextInput label={t("staff.address")} {...field} />}</FormControl>
            </div>
            <div className="col-span-2 border border-slate-300 rounded-md p-3 bg-slate-50 dark:bg-slate-800/50">
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
                <div className="grid grid-cols-2 gap-x-4 gap-2 mt-3">
                  <div className="col-span-1">
                    <FormControl name="accountEmail">
                      {(field) => (
                        <TextInput
                          label={`${t("staff.email")} (${t("staff.loginEmail")})`}
                          placeholder={form.getValues("email") || "staff@example.com"}
                          {...field}
                        />
                      )}
                    </FormControl>
                    <p className="text-xs text-slate-500 mt-1">{t("staff.loginEmailHint")}</p>
                  </div>
                  <div className="col-span-1">
                    <FormControl name="password">
                      {(field) => (
                        <TextInput label={t("staff.password")} type="password" placeholder="••••••••" {...field} />
                      )}
                    </FormControl>
                  </div>
                </div>
              )}
            </div>
            <div className="col-span-2 ml-auto">
              <TMButton variant="light" htmlType="submit" size="sm" loading={isLoading}>
                {t("common.save")}
              </TMButton>
            </div>
          </form>
        </FormProvider>
      </CardItem>
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
