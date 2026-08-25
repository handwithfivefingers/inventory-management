import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { FormProvider, useForm } from "react-hook-form";
import { warehouseService } from "~/action.server/warehouse.service";
import { CardItem } from "~/components/card-item";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
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
        throw new ResponseError({ error: resp?.error ?? t("common.tryAgain"), status: Number(resp.status) });
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
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title={t("warehouses.addTitle")} className="p-4 h-full">
        <FormProvider {...formMethods}>
          <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="col-span-2">
              <FormControl name="name">
                <TextInput label={t("warehouses.nameLabel")} />
              </FormControl>
            </div>
            <div className="col-span-1">
              <FormControl name="email">
                <TextInput label={t("warehouses.email")} />
              </FormControl>
            </div>
            <div className="col-span-1">
              <FormControl name="phone">
                <TextInput label={t("warehouses.phone")} />
              </FormControl>
            </div>
            <div className="col-span-2 ">
              <FormControl name="address">
                <TextInput label={t("warehouses.address")} />
              </FormControl>
            </div>
            <div className="col-span-2 flex justify-end">
              <TMButton htmlType="submit" loading={isLoading}>
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
    const { vendorId, cookie } = await parseCookieFromRequest(request);
    const formData = await request.formData();
    const data = JSON.parse(Object.fromEntries(formData)?.data as string);
    const resp = await warehouseService.createWarehouse({ ...data, vendorId, cookie });
    return json(resp);
  } catch (error) {
    return json({ status: 400, error: (error as any)?.message }, { status: 400 });
  }
};
