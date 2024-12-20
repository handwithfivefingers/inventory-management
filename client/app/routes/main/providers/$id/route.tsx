import { ActionFunctionArgs, data, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { useLoaderData, useSubmit, redirect, useFetcher } from "@remix-run/react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { providerService } from "~/action.server/provider.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const { id } = params;
    return providerService.getProviderById(id as string);
  } catch (error) {
    throw data(error, { status: 400 });
  }
};
export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProviderItem() {
  const { data } = useLoaderData<typeof loader>();
  const formMethods = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
    values: {
      ...data,
    },
  });
  const { control, handleSubmit } = formMethods;
  const { submit } = useFetcher();
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title="Chỉnh sửa đơn vị cung cấp">
        <FormProvider {...formMethods}>
          <form
            className="grid grid-cols-2 gap-x-4 gap-2"
            onSubmit={handleSubmit((v) =>
              submit({ data: JSON.stringify(v) }, { method: "POST", action: `/providers/${data.id}` })
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
                Lưu
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
    const form = await request.formData();
    const { id } = params;
    const data = form.get("data") as string;
    console.log("data", data);
    const parsed = JSON.parse(data);
    parsed.id = id;
    const resp = await providerService.update(parsed);
    console.log("resp", resp);
    if (resp.status === 200) {
      return redirect(`/providers`, 302);
    }
    return resp;
  } catch (error) {
    throw error;
  }
};
