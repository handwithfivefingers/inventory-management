import { zodResolver } from "@hookform/resolvers/zod";
import type { MetaFunction } from "@remix-run/node";
import { Link, redirect, useFetcher } from "@remix-run/react";
import { MouseEvent, useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { unitsService } from "~/action.server/units.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
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
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="dollar-sign" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">Đơn vị</h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">Thêm đơn vị mới</p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <UnitForm />
        </CardItem>
      </div>
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
        onSubmit={formMethods.handleSubmit(
          (v) => onSubmit({ ...v }),
          (error) => handleError(error),
        )}
        className="flex flex-col gap-5 mt-2"
      >
        <FormControl name="name">
          {(field) => {
            return (
              <TextInput
                label="Tên đơn vị"
                placeholder="Nhập tên đơn vị"
                required
                prefix={<Icon name="dollar-sign" fontSize={16} className="text-slate-400" />}
                value={field.value as any}
                onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
              />
            );
          }}
        </FormControl>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
          <TMButton variant="ghost" size="sm" component={Link} to="/units" type="button">
            Hủy
          </TMButton>
          <TMButton htmlType="submit" size="sm">
            <Icon name="save" fontSize={16} />
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
