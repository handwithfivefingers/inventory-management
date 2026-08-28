import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { FormProvider, useForm } from "react-hook-form";
import { staffService } from "~/action.server/staff.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { DatePicker } from "~/components/form/date-picker";
import { FormControl } from "~/components/form/form-control";
import { NumberInput } from "~/components/form/number-input";
import { SelectInput } from "~/components/form/select-input";
import { TextInput } from "~/components/form/text-input";
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
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title={`${t("staff.title")} - ${data.code}`} className="p-4">
        <FormProvider {...formMethods}>
          <form className="grid grid-cols-2 gap-x-4 gap-2" onSubmit={handleSubmit(onSubmit)}>
            <div className="col-span-1">
              <FormControl name="fullName">
                {(field) => <TextInput label={t("staff.fullName")} {...field} />}
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
            </div>
            <div className="col-span-1">
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
