import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { staffService } from "~/action.server/staff.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { NumberInput } from "~/components/form/number-input";
import { SelectInput } from "~/components/form/select-input";
import { TextInput } from "~/components/form/text-input";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { staffSchema } from "~/constants/schema/staff";
import { getSession } from "~/sessions";
import { useTranslation } from "~/i18n";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const { id } = params;
    const resp = await staffService.getById(id as string);
    return { data: resp.data?.data ?? null };
  } catch (error) {
    throw new Response("error", { status: 404 });
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Chi tiết nhân viên" }, { name: "description", content: "Chi tiết nhân viên" }];
};

export default function StaffDetail() {
  const { data } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const { t } = useTranslation();
  const formMethods = useForm({
    defaultValues: {
      fullName: data?.fullName ?? "",
      gender: data?.gender ?? "male",
      phone: data?.phone ?? "",
      email: data?.email ?? "",
      position: data?.position ?? "other",
      salary: data?.salary ?? 0,
      hireDate: data?.hireDate ?? "",
      status: data?.status ?? "active",
      address: data?.address ?? "",
    },
    resolver: zodResolver(staffSchema),
  });
  const { handleSubmit, control } = formMethods;

  useEffect(() => {
    if (fetcher.state === "idle" && (fetcher.data as any)?.status === 200) {
      toast.success({ title: "Thành công", message: "Cập nhật thành công" });
    }
  }, [fetcher.data, fetcher.state]);

  if (!data) return <div className="p-4">No data</div>;

  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title={`${t("staff.title")} - ${data.code}`} className="p-4">
        <FormProvider {...formMethods}>
          <form
            className="grid grid-cols-2 gap-x-4 gap-2"
            onSubmit={handleSubmit((v) =>
              fetcher.submit(
                { data: JSON.stringify(v) },
                { method: "POST", action: `/staff/${data.id}` }
              )
            )}
          >
            <div className="col-span-1">
              <FormControl name="fullName">{(field) => <TextInput label={t("staff.fullName")} {...field} />}</FormControl>
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
                  <NumberInput label={t("staff.salary")} value={field.value as any} onValueChange={(v) => field.onChange(v.value)} />
                )}
              </FormControl>
            </div>
            <div className="col-span-1">
              <FormControl name="hireDate">{(field) => <TextInput label={t("staff.hireDate")} type="date" {...field} />}</FormControl>
            </div>
            <div className="col-span-2">
              <FormControl name="address">{(field) => <TextInput label={t("staff.address")} {...field} />}</FormControl>
            </div>
            <div className="col-span-2 ml-auto">
              <TMButton variant="light" htmlType="submit">
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
    const { id } = params;
    const form = await request.formData();
    const data = form.get("data") as string;
    const resp = await staffService.update(id as string, JSON.parse(data));
    return resp;
  } catch (error) {
    return { status: 400, error: (error as any).message };
  }
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}
