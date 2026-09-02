import { zodResolver } from "@hookform/resolvers/zod";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect, useFetcher, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { tagsService } from "~/action.server/tags.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { productSchema } from "~/constants/schema/product";
import { ITagSchema } from "~/constants/schema/tag";
import { parseCookieFromRequest } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const { id } = params;
  const resp = await tagsService.getById({ id: id as string, vendorId, cookie });
  return resp.data?.data;
};

export const meta: MetaFunction = () => {
  return [{ title: "Thành phần" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProductItem() {
  const data = useLoaderData<typeof loader>();
  const [edit, setEdit] = useState<boolean>(false);
  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto">
        {data && (
          <CardItem
            title={
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                    <Icon name="tag" fontSize={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                      {edit ? "Chỉnh sửa" : "Thành phần"}
                    </h2>
                    <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                      {edit ? "Cập nhật thông tin thành phần" : "Chi tiết thành phần"}
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
            {!edit ? <Detail /> : null}

            {edit ? (
              <EditForm
                {...(data as Omit<ITagSchema, "id"> & { id: string | number })}
                onCancel={() => setEdit(false)}
              />
            ) : null}
          </CardItem>
        )}
      </div>
    </div>
  );
}
const Detail = () => {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="w-full flex flex-col gap-4 mt-2">
      <div className="w-full text-sm text-slate-700 dark:text-slate-200">Thẻ: {data?.name}</div>
      <div className="bg-slate-700 h-full rounded p-2">
        <h3>Relate Product</h3>
      </div>
    </div>
  );
};
const EditForm = ({ name, id, onCancel }: { name: string; id: Partial<string | number>; onCancel?: () => void }) => {
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
      { method: "POST", action: `/tags/${id}` },
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
                label="Tên thành phần"
                value={field.value as any}
                onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
                prefix={<Icon name="tag" fontSize={16} className="text-slate-400" />}
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
  const resp = await tagsService.update({ ...bodyData, vendorId, cookie } as any);
  if (resp.status === 200) {
    return redirect(`/tags`, 302);
  }
  return resp;
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}
