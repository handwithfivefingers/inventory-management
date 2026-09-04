import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { FormProvider, useForm } from "react-hook-form";
import { customerService } from "~/action.server/customer.service";
import { CardItem } from "~/components/card-item";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
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
    if (response.status === 201) {
      return redirect("/customers");
      return Response.json({ message: "Tạo khách hàng thành công", status: 200 }, { status: 200 });
    }
    throw response;
  } catch (error: any) {
    return Response.json({ error: error.message || "Tạo khách hàng thất bại", status: 400 }, { status: 400 });
  }
};
export const meta = [
  {
    title: "Tạo khách hàng",
  },
];

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
                      Tạo khách hàng mới
                    </h2>
                    <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                      Nhập thông tin khách hàng
                    </p>
                  </div>
                </div>
              </div>
            }
            className="p-5 sm:p-6"
          >
            <form method="post" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 mt-2">
              <FormControl name="name">
                <TextInput
                  label="Tên khách hàng"
                  placeholder="Nhập tên khách hàng"
                  required
                  prefix={<Icon name="user" fontSize={16} className="text-slate-400" />}
                />
              </FormControl>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormControl name="phone">
                  <TextInput
                    label="Số điện thoại"
                    placeholder="Nhập số điện thoại"
                    prefix={<Icon name="phone" fontSize={16} className="text-slate-400" />}
                  />
                </FormControl>
                <FormControl name="email">
                  <TextInput
                    label="Email"
                    type="email"
                    placeholder="Nhập email"
                    prefix={<Icon name="mail" fontSize={16} className="text-slate-400" />}
                  />
                </FormControl>
              </div>

              <FormControl name="address">
                <TextInput
                  label="Địa chỉ"
                  placeholder="Nhập địa chỉ"
                  multiline
                  rows={3}
                  prefix={<Icon name="map-pin" fontSize={16} className="text-slate-400" />}
                />
              </FormControl>

              <FormControl name="taxCode">
                <TextInput
                  label="Mã số thuế"
                  placeholder="Nhập mã số thuế"
                  prefix={<Icon name="file-text" fontSize={16} className="text-slate-400" />}
                />
              </FormControl>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
                <TMButton variant="ghost" size="sm" component={Link} to="/customers" type="button">
                  Hủy
                </TMButton>
                <TMButton htmlType="submit" disabled={isLoading} size="sm" loading={isLoading}>
                  <Icon name="save" fontSize={16} />
                  {isLoading ? "Đang tạo..." : "Tạo khách hàng"}
                </TMButton>
              </div>
            </form>
          </CardItem>
        </div>
      </div>
    </FormProvider>
  );
}
