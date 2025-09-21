import { zodResolver } from "@hookform/resolvers/zod";
import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { providerService } from "~/action.server/provider.service";
import { CardItem } from "~/components/card-item";
import { FormInput } from "~/components/form/formInput";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { id } = params;
    const cookie = request.headers.get("cookie") as string;
    if (!id) return redirect(`/providers`);
    const resp = await providerService.getProviderById({ id, cookie });
    console.log("resp", resp);
    if (resp.status !== 200) throw resp;
    return resp;
  } catch (error) {
    // throw data(error, { status: 400 });
    throw error;
  }
};
export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

const ProviderSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export default function ProviderItem() {
  const { data } = useLoaderData<typeof loader>();
  const formMethods = useForm({
    values: data,
    resolver: zodResolver(ProviderSchema),
  });
  const { control, handleSubmit } = formMethods;
  const onSubmit = (v: z.infer<typeof ProviderSchema>) => {
    console.log("v", v);
  };
  return (
    <div className="w-full flex flex-col p-2 gap-4">
      <CardItem title="Chỉnh sửa đơn vị cung cấp" className="flex p-4">
        <FormProvider {...formMethods}>
          <form
            className="grid grid-cols-2 gap-x-2 gap-2"
            onSubmit={handleSubmit(
              onSubmit
              // (v) =>
              // submit({ data: JSON.stringify(v) }, { method: "POST", action: `/providers/${data.id}` })
            )}
          >
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
            <div className="col-span-2">
              <FormInput name="address">
                <TextInput label="Địa chỉ" />
              </FormInput>
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
