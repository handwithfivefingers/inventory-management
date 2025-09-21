import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect, useFetcher, useRouteError } from "@remix-run/react";
import { useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { providerService } from "~/action.server/provider.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { providerSchema } from "~/constants/schema/provider";

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

interface IProviderFetcher {
  error: {
    path: string;
    msg: string;
  }[];
  [key: string]: any;
  status: number;
}

export default function ProviderItem({ children }: any) {
  const formMethods = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
    resolver: zodResolver(providerSchema),
  });
  const { control, handleSubmit } = formMethods;
  const fetcher = useFetcher<IProviderFetcher>({ key: "Provider-Add" });

  useEffect(() => {
    if ((fetcher.data as any)?.error) {
      const msg = `${fetcher.data?.error[0]?.path}  ${fetcher.data?.error[0]?.msg}`;
      toast.danger({ title: "Lỗi", message: !!msg.trim() ? msg : fetcher.data?.error.toString() });
    }
  }, [fetcher.data]);
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

            <div className="col-span-2">{children}</div>
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

export const ErrorBoundary = () => {
  const error = useRouteError();
  return (
    <ProviderItem>
      <div>
        <span>{JSON.stringify(error, null, 2)}</span>
      </div>
    </ProviderItem>
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const form = await request.formData();
    const data = form.get("data") as string;
    const resp = await providerService.create(JSON.parse(data));
    console.log("resp", resp);
    // return redirect("/providers");
    return false;
  } catch (error) {
    return {
      status: 400,
      error: (error as any).error?.errors,
    };
  }
};
