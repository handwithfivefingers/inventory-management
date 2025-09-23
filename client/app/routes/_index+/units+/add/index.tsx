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
import { useSubmitPromise } from "~/hooks";
import { ResponseError } from "~/http";
import { parseCookieFromRequest } from "~/sessions";
export const meta: MetaFunction = () => {
  return [{ title: "Unit - Đơn vị" }];
};

export default function UnitItem() {
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title="Đơn vị" className="p-4 h-full">
        <UnitForm />
      </CardItem>
    </div>
  );
}

const UnitForm = () => {
  const fetcher = useFetcher<{ status: boolean; data: any }>({ key: "units-add" });
  const { submit, isLoading } = useSubmitPromise();
  const formMethods = useForm({
    defaultValues: {
      name: "",
    },
    resolver: zodResolver(productSchema),
  });

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };
  const onSubmit = async (v: any) => {
    try {
      const resp = await submit({ data: JSON.stringify(v) }, { method: "POST" });
      console.log("resp", resp);
      toast.success({ title: "Created", message: "Tạo đơn vị thành công" });
    } catch (error) {
      if (error instanceof ResponseError) {
        toast.danger({ title: "Error", message: error.message });
      } else {
        console.log("onSubmit Error", error);
      }
    }
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
    const { cookie, vendorId } = await parseCookieFromRequest(request);
    const formData = await request.formData();
    const data = (await formData.get("data")) as `${string}`;
    const dataJson: { name: string } = JSON.parse(data);
    const bodyData = { ...dataJson, vendorId: vendorId, cookie };
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
