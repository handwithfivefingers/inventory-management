import { zodResolver } from "@hookform/resolvers/zod";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect, useFetcher, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { unitsService } from "~/action.server/units.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { IUnitSchema, unitSchema } from "~/constants/schema/units";
import { parseCookieFromRequest } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const id = params.id as string;
  const resp = await unitsService.getById({ id: Number(id), vendorId: vendorId as string, cookie });
  return resp.data?.data;
};

export const meta: MetaFunction = () => {
  return [{ title: "Product Item" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProductItem() {
  const data = useLoaderData<typeof loader>();
  const [edit, setEdit] = useState<boolean>(false);
  console.log("data", data);
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
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                    {edit ? "Chỉnh sửa" : "Đơn vị"}
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                    {edit ? "Cập nhật thông tin đơn vị" : "Chi tiết đơn vị"}
                  </p>
                </div>
              </div>
              <TMButton variant="ghost" size="xs" onClick={() => setEdit(!edit)}>
                {edit ? "Hủy" : "Sửa"}
              </TMButton>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <div className="flex gap-2 flex-col">
            {!edit ? <Detail /> : null}
            {edit ? <EditForm {...(data as IUnitSchema)} onCancel={() => setEdit(false)} /> : null}
          </div>
        </CardItem>
      </div>
    </div>
  );
}
const Detail = () => {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="w-full grid grid-cols-5 gap-4 mt-2">
      <div className="col-span-5 text-sm text-slate-700 dark:text-slate-200">{data?.name}</div>
    </div>
  );
};
const EditForm = ({ name, id, onCancel }: IUnitSchema & { onCancel?: () => void }) => {
  const fetcher = useFetcher();
  const formMethods = useForm<IUnitSchema>({
    values: {
      id,
      name,
    },
    resolver: zodResolver(unitSchema),
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
      { method: "POST", action: `/units/${id}` },
    );
  };
  return (
    <FormProvider {...formMethods}>
      <form
        className="flex flex-col gap-5 mt-2"
        onSubmit={formMethods.handleSubmit(
          (v) => onSubmit({ ...v }),
          (error) => handleError(error),
        )}
      >
        <FormControl name="name">
          {(field) => {
            return (
              <TextInput
                label="Tên đơn vị"
                value={field.value as any}
                onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
                prefix={<Icon name="dollar-sign" fontSize={16} className="text-slate-400" />}
              />
            );
          }}
        </FormControl>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
          <TMButton variant="ghost" size="sm" type="button" onClick={onCancel}>
            Hủy
          </TMButton>
          <TMButton htmlType="submit" size="sm">
            <Icon name="save" fontSize={16} />
            Lưu
          </TMButton>
        </div>
      </form>
    </FormProvider>
  );
};

export const action = async ({ request, params }: any) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const { id } = params;
  const formData = await request.formData();
  const data = await formData.get("data");
  const dataJson = JSON.parse(data);
  const bodyData = { ...dataJson.data, id };
  const resp = await unitsService.update({ ...bodyData, vendorId, cookie } as any);
  if (resp.status === 200) {
    return redirect(`/units`, 302);
  }
  return resp;
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}
