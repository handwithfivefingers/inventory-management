import type { MetaFunction } from "@remix-run/node";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { TMButton } from "~/components/tm-button";
import { FormInput } from "~/components/form/formInput";
import { useSubmitPromise } from "~/hooks";
import { warehouseService } from "~/action.server/warehouse.service";
import { ResponseError } from "~/http";
import { toast } from "~/components/notification";
import { parseCookieFromRequest } from "~/sessions";
export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};
const warehouseSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type warehouseSchemaType = z.infer<typeof warehouseSchema>;
export default function WarehouseItem() {
  const formMethods = useForm<warehouseSchemaType>({
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
  const onSubmit = async (v: warehouseSchemaType) => {
    try {
      console.log("v", v);
      const resp = await submit({ data: JSON.stringify(v) }, { method: "POST" });
      console.log("resp", resp);
      toast.success({ title: "Created", message: "Tạo kho hàng thành công" });
    } catch (error) {
      console.log("error", error);
      if (error instanceof ResponseError) {
        toast.danger({ title: "Error", message: error.message });
      }
    }
  };
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title="Thêm kho hàng" className="p-4 h-full">
        <FormProvider {...formMethods}>
          <form className="grid grid-cols-4 gap-2 h-full" onSubmit={handleSubmit(onSubmit)}>
            <div className="col-span-3 h-full bg-slate-700 p-4 rounded">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormInput name="name">
                    <TextInput label="Tên kho hàng" />
                  </FormInput>
                </div>
                <div className="col-span-1">
                  <FormInput name="email">
                    <TextInput label="Email" />
                  </FormInput>
                </div>
                <div className="col-span-1">
                  <FormInput name="phone">
                    <TextInput label="Số điện thoại" />
                  </FormInput>
                </div>
                <div className="col-span-2 ">
                  <FormInput name="address">
                    <TextInput label="Địa chỉ" />
                  </FormInput>
                </div>
                <div className="col-span-2 flex justify-end">
                  <TMButton htmlType="submit" className="" loading={isLoading}>
                    Tạo mới
                  </TMButton>
                </div>
              </div>
            </div>
            <div className="col-span-1 h-full bg-slate-700 p-4 rounded"></div>
          </form>
        </FormProvider>
      </CardItem>
    </div>
  );
}

export const action = async ({ request }: any) => {
  try {
    const { vendorId, cookie } = await parseCookieFromRequest(request);
    const formData = await request.formData();
    const data = JSON.parse(Object.fromEntries(formData)?.data);
    console.log("data", data);
    const resp = await warehouseService.createWarehouse({ ...data, vendorId, cookie });
    return Response.json(resp);
  } catch (error) {
    return Response.json({ error: (error as any)?.message }, { status: 400 });
  }
};
