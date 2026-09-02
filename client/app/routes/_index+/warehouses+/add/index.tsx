import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useNavigate } from "@remix-run/react";
import { FormProvider, useForm } from "react-hook-form";
import { warehouseService } from "~/action.server/warehouse.service";
import { CardItem } from "~/components/card-item";
import { CheckboxInput } from "~/components/form/checkbox-input";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { warehouseSchema, WarehouseSchema } from "~/constants/schema/warehouse";
import { useSubmitPromise } from "~/hooks";
import { ResponseError } from "~/http";
import { parseCookieFromRequest } from "~/sessions";
import { useTranslation } from "~/i18n";

export const meta: MetaFunction = () => {
  return [{ title: "Thêm kho hàng" }, { name: "description", content: "Thêm kho hàng mới" }];
};

export default function WarehouseAdd() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const formMethods = useForm<WarehouseSchema>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      isMain: false,
    },
    resolver: zodResolver(warehouseSchema),
  });
  const { handleSubmit } = formMethods;
  const { submit, isLoading } = useSubmitPromise();

  const onSubmit = async (v: WarehouseSchema) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp = await submit<any>({ data: JSON.stringify(v) }, { method: "POST" });
      if (resp?.status && Number(resp.status) >= 400) {
        const message = Array.isArray(resp?.error)
          ? resp.error.map((e: any) => `${e.path} ${e.msg}`).join(", ")
          : resp?.error ?? resp?.message ?? t("common.tryAgain");
        throw new ResponseError({ error: message, status: Number(resp.status) });
      }
      toast.success({ title: t("common.success"), message: t("warehouses.createSuccess") });
      navigate("/warehouses");
    } catch (error) {
      if (error instanceof ResponseError) {
        toast.danger({ title: t("common.error"), message: error.message });
      }
    }
  };

  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="plus" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                    {t("warehouses.addTitle")}
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                    {t("warehouses.formHint")}
                  </p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <FormProvider {...formMethods}>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 mt-2">
              <FormControl name="name">
                <TextInput
                  label={t("warehouses.nameLabel")}
                  placeholder={t("warehouses.namePlaceholder")}
                  required
                  prefix={<Icon name="home" fontSize={16} className="text-slate-400" />}
                />
              </FormControl>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormControl name="phone">
                  <TextInput
                    label={t("warehouses.phone")}
                    placeholder={t("warehouses.phonePlaceholder")}
                    prefix={<Icon name="phone" fontSize={16} className="text-slate-400" />}
                  />
                </FormControl>
                <FormControl name="email">
                  <TextInput
                    label={t("warehouses.email")}
                    placeholder={t("warehouses.emailPlaceholder")}
                    prefix={<Icon name="mail" fontSize={16} className="text-slate-400" />}
                  />
                </FormControl>
              </div>

              <FormControl name="address">
                <TextInput
                  label={t("warehouses.address")}
                  placeholder={t("warehouses.addressPlaceholder")}
                  multiline
                  rows={3}
                  prefix={<Icon name="map-pin" fontSize={16} className="text-slate-400" />}
                />
              </FormControl>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-900/10 dark:border-amber-800 p-4 flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-300">
                  <Icon name="star" fontSize={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {t("warehouses.isMain")}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t("warehouses.isMainHint")}
                      </p>
                    </div>
                    <FormControl name="isMain" className="!gap-0">
                      {(field) => (
                        <CheckboxInput
                          value={!!field.value}
                          onChange={(e: any) => field.onChange(e?.target ? e.target.checked : !!e)}
                        />
                      )}
                    </FormControl>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
                <TMButton variant="ghost" size="sm" component={Link} to="/warehouses" type="button">
                  {t("common.cancel")}
                </TMButton>
                <TMButton htmlType="submit" loading={isLoading} size="sm">
                  <Icon name="save" fontSize={16} />
                  {isLoading ? t("warehouses.saving") : t("common.save")}
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
    const { vendorId, cookie } = await parseCookieFromRequest(request);
    const formData = await request.formData();
    const data = JSON.parse(Object.fromEntries(formData)?.data as string);
    const resp = await warehouseService.createWarehouse({ ...data, vendorId, cookie });
    return json(resp);
  } catch (error) {
    return json({ status: 400, error: (error as any)?.message }, { status: 400 });
  }
};
