import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { FormProvider, useForm } from "react-hook-form";
import { providerService } from "~/action.server/provider.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { providerUpdateSchema, ProviderUpdateSchema } from "~/constants/schema/provider";
import { useSubmitPromise } from "~/hooks";
import { ResponseError } from "~/http";
import { parseCookieFromRequest } from "~/sessions";
import { useTranslation } from "~/i18n";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { id } = params;
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  if (!id) return redirect("/providers");
  const resp = await providerService.getProviderById({ id, cookie, vendorId });
  if (resp.status !== 200) throw new Response("Provider not found", { status: resp.status });
  return { ...resp.data };
};

export const meta: MetaFunction = () => {
  return [{ title: "Chỉnh sửa nhà cung cấp" }, { name: "description", content: "Chỉnh sửa nhà cung cấp" }];
};

export default function ProviderItem() {
  const { data } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const formMethods = useForm<ProviderUpdateSchema>({
    values: data,
    resolver: zodResolver(providerUpdateSchema),
  });
  const { handleSubmit } = formMethods;
  const { submit, isLoading } = useSubmitPromise();
  const onSubmit = async (v: ProviderUpdateSchema) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp = await submit<any>({ data: JSON.stringify(v) }, { method: "POST", action: `/providers/${v.id}` });
      if (resp?.status && Number(resp.status) >= 400) {
        throw new ResponseError({ error: resp?.error ?? t("common.tryAgain"), status: Number(resp.status) });
      }
      toast.success({ title: t("common.success"), message: t("providers.updateSuccess") });
      navigate("/providers");
    } catch (error) {
      if (error instanceof ResponseError) {
        toast.danger({ title: t("common.error"), message: error.message });
      }
    }
  };
  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="truck" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                    {t("providers.editTitle") || `${t("providers.title")}: ${data?.name}`}
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                    {t("providers.formHint")}
                  </p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <FormProvider {...formMethods}>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 mt-2">
              <FormControl name="name">
                <TextInput
                  label={t("providers.name")}
                  required
                  prefix={<Icon name="truck" fontSize={16} className="text-slate-400" />}
                />
              </FormControl>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormControl name="phone">
                  <TextInput
                    label={t("providers.phone")}
                    prefix={<Icon name="phone" fontSize={16} className="text-slate-400" />}
                  />
                </FormControl>
                <FormControl name="email">
                  <TextInput
                    label={t("providers.email")}
                    prefix={<Icon name="mail" fontSize={16} className="text-slate-400" />}
                  />
                </FormControl>
              </div>

              <FormControl name="address">
                <TextInput
                  label={t("providers.address")}
                  multiline
                  rows={3}
                  prefix={<Icon name="map-pin" fontSize={16} className="text-slate-400" />}
                />
              </FormControl>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
                <TMButton variant="ghost" size="sm" component={Link} to=".." type="button">
                  {t("common.cancel")}
                </TMButton>
                <TMButton htmlType="submit" loading={isLoading} size="sm">
                  <Icon name="save" fontSize={16} />
                  {isLoading ? t("providers.saving") : t("common.save")}
                </TMButton>
              </div>
            </form>
          </FormProvider>
        </CardItem>
      </div>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  try {
    const { cookie, vendorId } = await parseCookieFromRequest(request);
    const formData = await request.formData();
    const data = JSON.parse(Object.fromEntries(formData)?.data as string);
    const resp = await providerService.update({ ...data, id: params.id, vendorId, cookie });
    return json(resp);
  } catch (error) {
    return json({ error: (error as any)?.message }, { status: 400 });
  }
};
