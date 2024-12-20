import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { providerService } from "~/action.server/provider.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProviderItem() {
  const formMethods = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  });
  const { control, handleSubmit } = formMethods;
  const fetcher = useFetcher({ key: "Provider-Add" });
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title="Thêm đơn vị cung cấp">
        <FormProvider {...formMethods}>
          <form
            className="grid grid-cols-2 gap-x-4 gap-2"
            onSubmit={handleSubmit((v) =>
              fetcher.submit(
                { data: JSON.stringify(v) },
                {
                  method: "POST",
                  action: "/providers/add",
                }
              )
            )}
          >
            <div className="col-span-2">
              <Controller
                control={control}
                name="name"
                render={({ field }) => <TextInput label="Tên kho hàng" {...field} />}
              />
            </div>
            <div className="col-span-1">
              <Controller
                control={control}
                name="email"
                render={({ field }) => <TextInput label="Email" {...field} />}
              />
            </div>
            <div className="col-span-1">
              <Controller
                control={control}
                name="phone"
                render={({ field }) => <TextInput label="Số điện thoại" {...field} />}
              />
            </div>
            <div className="col-span-2 ">
              <Controller
                control={control}
                name="address"
                render={({ field }) => <TextInput label="Đia chỉ" {...field} />}
              />
            </div>
            <div className="col-span-2 ml-auto">
              <TMButton variant="light" htmlType="submit">
                Submit
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
    const form = await request.formData();
    const data = form.get("data") as string;
    const resp = await providerService.create(JSON.parse(data));
    return resp;
  } catch (error) {
    throw error;
  }
};
