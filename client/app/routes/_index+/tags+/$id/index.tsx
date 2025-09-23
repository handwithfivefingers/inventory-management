import { zodResolver } from "@hookform/resolvers/zod";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect, useFetcher, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { tagsService } from "~/action.server/tags.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { productSchema } from "~/constants/schema/product";
import { ITagSchema } from "~/constants/schema/tag";
import { parseCookieFromRequest } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const { id } = params;
  const resp = await tagsService.getById({ id: id as string, vendorId, cookie });
  return resp;
};

export const meta: MetaFunction = () => {
  return [{ title: "Thành phần" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProductItem() {
  const { data } = useLoaderData<typeof loader>();
  const [edit, setEdit] = useState<boolean>(false);
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      {data && (
        <CardItem
          title={
            <div className="flex justify-between items-center">
              <h5>{edit ? "Chỉnh sửa" : "Thành phần"}</h5>
              <TMButton variant="ghost" size="xs" onClick={() => setEdit(!edit)}>
                {edit ? "Hủy" : "Sửa"}
              </TMButton>
            </div>
          }
          className="p-4 h-full"
        >
          {!edit ? <Detail /> : null}

          {edit ? <EditForm {...(data as Omit<ITagSchema, "id"> & { id: string | number })} /> : null}
        </CardItem>
      )}
    </div>
  );
}
const Detail = () => {
  const { data } = useLoaderData<typeof loader>();
  return (
    <div className="w-full flex flex-col gap-4 h-full">
      <div className="w-full">Thẻ: {data?.name}</div>
      <div className="bg-slate-700 h-full rounded p-2">
        <h3>Relate Product</h3>
      </div>
    </div>
  );
};
const EditForm = ({ name, id }: { name: string; id: Partial<string | number> }) => {
  const fetcher = useFetcher();
  const formMethods = useForm({
    values: {
      name,
      id,
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
      { method: "POST", action: `/tags/${id}` }
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
                  label="Tên thành phần"
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
  const resp = await tagsService.update(bodyData);
  if (resp.status === 200) {
    return redirect(`/tags`, 302);
  }
  return resp;
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}
