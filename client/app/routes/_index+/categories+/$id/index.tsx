import { zodResolver } from "@hookform/resolvers/zod";
import type { MetaFunction } from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { FormProvider, useForm } from "react-hook-form";
import { categoryService } from "~/action.server/category.service";
import { LoaderArgs } from "~/action.server/context.server";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { tagSchema } from "~/constants/schema/tag";
import { useSubmitPromise } from "~/hooks";
import { useTranslation } from "~/i18n";

export async function loader({ request, params }: LoaderArgs) {
  const { id } = params;
  const resp = await categoryService.getById(id as string);
  return resp.data?.data;
}

export const meta: MetaFunction = () => {
  return [{ title: "Category Detail" }];
};

export default function CategoryEdit() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="tag" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                    {t("common.edit") + " " + data?.name}
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                    Cập nhật thông tin danh mục
                  </p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <EditForm />
        </CardItem>
      </div>
    </div>
  );
}

const EditForm = () => {
  const data = useLoaderData<typeof loader>();
  const formMethods = useForm({
    defaultValues: data,
    resolver: zodResolver(tagSchema),
  });

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };
  const { submit, isLoading } = useSubmitPromise();

  const onSubmit = async (v: { name: string }) => {
    try {
      const resp = await submit<{ status: number }>(
        {
          data: JSON.stringify({
            data: v,
          }),
        },
        { method: "POST", action: `/categories/${data?.id}` },
      );
      if (resp.status !== 200) throw resp;
      toast.success({ title: "Created", message: "Tạo đơn vị thành công" });
    } catch (error) {
      toast.danger({ title: "Error", message: (error as any)?.data?.error || (error as Error).message });
    }
  };
  return (
    <FormProvider {...formMethods}>
      <form className="flex flex-col gap-5 mt-2" onSubmit={formMethods.handleSubmit(onSubmit, handleError)}>
        <FormControl name="name">
          {(field) => {
            return (
              <TextInput
                label="Tên danh mục"
                required
                prefix={<Icon name="tag" fontSize={16} className="text-slate-400" />}
                value={field.value as any}
                onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
              />
            );
          }}
        </FormControl>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
          <TMButton htmlType="submit" size="sm" loading={isLoading}>
            <Icon name="save" fontSize={16} />
            Lưu
          </TMButton>
        </div>
      </form>
    </FormProvider>
  );
};

export async function action({ request, params }: any) {
  const formData = await request.formData();
  const { id } = params;
  const data = await formData.get("data");
  const dataJson = JSON.parse(data);
  const bodyData = { ...dataJson.data, id };
  const resp = await categoryService.update(id, { ...bodyData });
  if (resp.status === 200) {
    return redirect(`/categories`, 302);
  }
  return resp;
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}
