import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { FormProvider, useForm } from "react-hook-form";
import { staffService } from "~/action.server/staff.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { DatePicker } from "~/components/form/date-picker";
import { FormControl } from "~/components/form/form-control";
import { NumberInput } from "~/components/form/number-input";
import { SelectInput } from "~/components/form/select-input";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { StaffSchema, staffSchema } from "~/constants/schema/staff";
import { useSubmitPromise } from "~/hooks";
import { useTranslation } from "~/i18n";
import { parseCookieFromRequest } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { cookie, vendorId } = await parseCookieFromRequest(request);
    const { id } = params;
    const resp = await staffService.getById(id as string, cookie, vendorId);
    return { data: resp.data?.data ?? null, id };
  } catch (error) {
    throw new Response("error", { status: 404 });
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Chi tiết nhân viên" }, { name: "description", content: "Chi tiết nhân viên" }];
};

export default function StaffDetail() {
  const { data, id } = useLoaderData<typeof loader>();
  // const fetcher = useFetcher();
  const { submit, isLoading } = useSubmitPromise();
  const { t } = useTranslation();
  const formMethods = useForm<StaffSchema>({
    defaultValues: {
      fullName: data?.fullName ?? "",
      gender: data?.gender ?? "male",
      phone: data?.phone ?? "",
      email: data?.email ?? "",
      salary: data?.salary ?? 0,
      hireDate: data?.hireDate ?? "",
      status: data?.status ?? "active",
      address: data?.address ?? "",
    },
    resolver: staffSchema,
  });
  const { handleSubmit, control } = formMethods;

  // useEffect(() => {
  //   if (fetcher.state === "idle" && (fetcher.data as any)?.status === 200) {
  //     toast.success({ title: "Thành công", message: "Cập nhật thành công" });
  //   }
  // }, [fetcher.data, fetcher.state]);

  const onSubmit = async (values: StaffSchema) => {
    try {
      const response = await submit({ data: JSON.stringify(values) }, { method: "POST", action: `/staff/${id}` });
      console.log("Response", response);
    } catch (error) {
      console.log("error", error);
    }
  };
  if (!data) return <div className="p-4">No data</div>;

  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="users" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                    {t("staff.title")} - {data.code}
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">Chi tiết nhân viên</p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <FormProvider {...formMethods}>
            <form className="flex flex-col gap-5 mt-2" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormControl name="fullName">
                  {(field) => (
                    <TextInput
                      label={t("staff.fullName")}
                      {...field}
                      prefix={<Icon name="user" fontSize={16} className="text-slate-400" />}
                    />
                  )}
                </FormControl>
                <FormControl name="phone">
                  {(field) => (
                    <TextInput
                      label={t("staff.phone")}
                      {...field}
                      prefix={<Icon name="phone" fontSize={16} className="text-slate-400" />}
                    />
                  )}
                </FormControl>
                <FormControl name="email">
                  {(field) => (
                    <TextInput
                      label={t("staff.email")}
                      {...field}
                      prefix={<Icon name="mail" fontSize={16} className="text-slate-400" />}
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
                <FormControl name="position">
                  {(field) => (
                    <SelectInput
                      label={t("staff.position")}
                      options={[
                        { label: "Manager", value: "manager" },
                        { label: "Cashier", value: "cashier" },
                        { label: "Warehouse", value: "warehouse" },
                        { label: "Sales", value: "sales" },
                        { label: "Other", value: "other" },
                      ]}
                      {...field}
                      onSelect={(v) => field.onChange(v)}
                    />
                  )}
                </FormControl>
                <FormControl name="status">
                  {(field) => (
                    <SelectInput
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
                    {...field}
                    prefix={<Icon name="map-pin" fontSize={16} className="text-slate-400" />}
                  />
                )}
              </FormControl>
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

export const action = async ({ request, params }: ActionFunctionArgs) => {
  try {
    const { cookie, vendorId } = await parseCookieFromRequest(request);
    const { id } = params;
    const form = await request.formData();
    const data = form.get("data") as string;
    const resp = await staffService.update(id as string, { ...JSON.parse(data), cookie, vendorId });
    return resp;
  } catch (error) {
    return { status: 400, error: (error as any).message };
  }
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}
