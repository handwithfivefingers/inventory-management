import { zodResolver } from "@hookform/resolvers/zod";
import type { MetaFunction } from "@remix-run/node";
import { redirect, useFetcher } from "@remix-run/react";
import { MouseEvent, useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { unitsService } from "~/action.server/units.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { productSchema } from "~/constants/schema/product";
import { getSession } from "~/sessions";
export const meta: MetaFunction = () => {
  return [{ title: "Unit - Đơn vị" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function UnitItem() {
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title="Đơn vị">
        <UnitForm />
      </CardItem>
    </div>
  );
}

const UnitForm = () => {
  const fetcher = useFetcher<{ status: boolean; data: any }>({ key: "units-add" });
  const formMethods = useForm({
    defaultValues: {
      name: "",
    },
    resolver: zodResolver(productSchema),
  });

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };
  const onSubmit = (v: any): void => {
    fetcher.submit(
      {
        data: JSON.stringify({
          data: v,
        }),
      },
      { method: "POST", action: "/units/add" }
    );
  };

  useEffect(() => {
    if (fetcher.state === "loading" && fetcher.data?.data) {
      fetcher.data = undefined;
      toast.success({ message: "Thêm đơn vị thành công" });
    }
  }, [fetcher.state]);
  return (
    <FormProvider {...formMethods}>
      <form
        className="py-2 grid grid-cols-12 gap-4"
        onSubmit={formMethods.handleSubmit(
          (v) => onSubmit({ ...v }),
          (error) => handleError(error)
        )}
      >
        <div className="col-span-12">
          <Controller
            name="name"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <TextInput
                  label="Tên đơn vị"
                  value={field.value as any}
                  onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
                />
              );
            }}
          />
        </div>
        <div className="ml-auto col-span-12">
          <TMButton htmlType="submit" variant="light">
            Thêm
          </TMButton>
        </div>
      </form>
    </FormProvider>
  );
};
export const action = async ({ request }: any) => {
  try {
    const session = await getSession(request.headers.get("Cookie"));
    const vendor = session.get("vendor");
    const formData = await request.formData();
    const data = await formData.get("data");
    const dataJson = JSON.parse(data);
    const bodyData = { ...dataJson.data, vendorId: vendor };
    const resp = await unitsService.create(bodyData);
    if (resp.status === 200) {
      return redirect(`/units`, 302);
    }
    return resp;
  } catch (error) {
    console.log("error", error);
    return { status: false };
  }
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}
