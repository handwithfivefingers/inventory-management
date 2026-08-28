import { ActionFunctionArgs } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { FormProvider, useForm } from "react-hook-form";
import { customerService } from "~/action.server/customer.service";
import { CardItem } from "~/components/card-item";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { CustomerSchema, customerSchema } from "~/constants/schema/customer";
import { useSubmitPromise } from "~/hooks";
import { parseCookieFromRequest } from "~/sessions";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { cookie, vendorId } = await parseCookieFromRequest(request);
    const formData = await request.formData();
    const data = JSON.parse((await formData.get("data")) as string);
    data.vendorId = vendorId;
    const response = await customerService.createCustomer({ cookie, ...data });
    console.log("response", response);
    if (response.status === 201) {
      return Response.json({ message: "Tạo khách hàng thành công", status: 200 }, { status: 200 });
    }
    throw response;
  } catch (error: any) {
    return Response.json({ error: error.message || "Tạo khách hàng thất bại", status: 400 }, { status: 400 });
  }
};

export default function AddCustomer() {
  const { submit, isLoading } = useSubmitPromise();
  const form = useForm<CustomerSchema>({
    defaultValues: {
      name: "",
      phone: "",
      email: undefined,
      address: "",
      taxCode: "",
    },
    resolver: customerSchema,
  });

  const onSubmit = async (values: CustomerSchema) => {
    try {
      const response = await submit<{ status: number }>({ data: JSON.stringify(values) }, { method: "POST" });
      console.log("response", response);
      if (response.status !== 200) throw response;
      toast.success({ title: "Success", message: "Tạo khách hàng thành công" });
    } catch (error) {
      console.log("Error", error);
      toast.danger({ title: "Error", message: "Tạo khách hàng thất bại" });
    }
  };

  return (
    <FormProvider {...form}>
      <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
        <CardItem title="Tạo khách hàng mới" className="p-4">
          <form method="post" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 max-w-2xl">
            <FormControl name="name">
              <TextInput label="Tên khách hàng" placeholder="Nhập tên khách hàng" required />
            </FormControl>

            <div className="grid grid-cols-2 gap-4">
              <FormControl name="phone">
                <TextInput label="Số điện thoại" placeholder="Nhập số điện thoại" />
              </FormControl>
              <FormControl name="email">
                <TextInput label="Email" type="email" placeholder="Nhập email" />
              </FormControl>
            </div>

            <FormControl name="address">
              <TextInput label="Địa chỉ" placeholder="Nhập địa chỉ" multiline rows={3} />
            </FormControl>

            <FormControl name="taxCode">
              <TextInput label="Mã số thuế" placeholder="Nhập mã số thuế" />
            </FormControl>

            <div className="flex gap-2 justify-end pt-4">
              <Link to="/customers">
                <TMButton variant="light" size="sm">
                  Hủy
                </TMButton>
              </Link>
              <TMButton type="submit" disabled={isLoading} size="sm" loading={isLoading}>
                {isLoading ? "Đang tạo..." : "Tạo khách hàng"}
              </TMButton>
            </div>
          </form>
        </CardItem>
      </div>
    </FormProvider>
  );
}
