import { zodResolver } from "@hookform/resolvers/zod";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { FieldError, FieldErrors, FormProvider, useForm } from "react-hook-form";
import { unitsService } from "~/action.server/units.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { IUnitSchema, unitSchema } from "~/constants/schema/units";
import { useSubmitPromise } from "~/hooks";
import { useTranslation } from "~/i18n";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const id = params.id as string;
  const resp = await unitsService.getById(id);
  return resp.data?.data;
}

export const meta: MetaFunction = () => {
  return [{ title: "Product Item" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function UnitItem() {
  const { t } = useTranslation();
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
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">{t("common.edit")}</h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                    Cập nhật thông tin đơn vị
                  </p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <div className="flex gap-2 flex-col">
            <EditForm />
          </div>
        </CardItem>
      </div>
    </div>
  );
}

const EditForm = () => {
  const data = useLoaderData<typeof loader>();
  const { submit, isLoading } = useSubmitPromise();
  const formMethods = useForm<IUnitSchema>({
    defaultValues: {
      id: data?.id,
      name: data?.name,
    },
    resolver: zodResolver(unitSchema),
  });

  const onError = (errors: FieldErrors<IUnitSchema>) => {
    console.log("errors", errors);
  };
  const onSubmit = async (v: IUnitSchema) => {
    try {
      const resp = await submit<{ status: number }>(
        {
          data: JSON.stringify({
            data: v,
          }),
        },
        { method: "POST", action: `/units/${data?.id}` },
      );
      if (resp.status !== 200) throw resp;
      toast.success({ title: "Created", message: "Tạo đơn vị thành công" });
    } catch (error) {
      toast.danger({ title: "Error", message: (error as any)?.data?.error || (error as Error).message });
    }
  };
  return (
    <FormProvider {...formMethods}>
      <form className="flex flex-col gap-5 mt-2" onSubmit={formMethods.handleSubmit(onSubmit, onError)}>
        <div className="flex gap-4">
          <FormControl name="name" className="flex-1">
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
        </div>
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
  try {
    const { id } = params;
    const formData = await request.formData();
    const data = await formData.get("data");
    const dataJson = JSON.parse(data);
    const bodyData = { ...dataJson.data, id };
    // Just force delete
    const resp = await unitsService.update(bodyData);
    if (resp.status === 200) {
      return redirect(`/units`, 302);
    }
    return resp;
  } catch (error) {
    return Response.json(error);
  }
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}
