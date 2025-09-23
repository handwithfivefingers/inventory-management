import { zodResolver } from "@hookform/resolvers/zod";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect, useFetcher, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { unitsService } from "~/action.server/units.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { productSchema } from "~/constants/schema/product";
import { IUnitSchema, unitSchema } from "~/constants/schema/units";
import { getSession, getSessionValues } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  // const session = await getSession(request.headers.get("Cookie"));
  // const vendorId = session.get("vendor");
  const cookie = request.headers.get("cookie") as string;
  const { vendorId } = await getSessionValues(cookie);
  const id = params.id as string;
  const resp = await unitsService.getById({ id: Number(id), vendor: vendorId as string, cookie });
  return resp;
};

export const meta: MetaFunction = () => {
  return [{ title: "Product Item" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProductItem() {
  const { data } = useLoaderData<typeof loader>();
  const [edit, setEdit] = useState<boolean>(false);
  console.log("data", data);
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem
        title={
          <div className="flex justify-between items-center">
            <h5>{edit ? "Chỉnh sửa" : "Đơn vị"}</h5>
            <TMButton variant="ghost" size="xs" onClick={() => setEdit(!edit)}>
              {edit ? "Hủy" : "Sửa"}
            </TMButton>
          </div>
        }
        className="p-4 h-full"
      >
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          {!edit ? <Detail /> : null}
          {edit ? <EditForm {...(data as IUnitSchema)} /> : null}
        </div>
      </CardItem>
    </div>
  );
}
const Detail = () => {
  const { data } = useLoaderData<typeof loader>();
  return (
    <div className="w-full grid grid-cols-5 gap-4">
      <div className="col-span-5">{data?.name}</div>
    </div>
  );
};
const EditForm = ({ name, id }: IUnitSchema) => {
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
      { method: "POST", action: `/units/${id}` }
    );
  };
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
            Lưu
          </TMButton>
        </div>
      </form>
    </FormProvider>
  );
};

export const action = async ({ request, params }: any) => {
  const { id } = params;
  const formData = await request.formData();
  const data = await formData.get("data");
  const dataJson = JSON.parse(data);
  const bodyData = { ...dataJson.data, id };
  const resp = await unitsService.update(bodyData);
  if (resp.status === 200) {
    return redirect(`/units`, 302);
  }
  return resp;
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}
