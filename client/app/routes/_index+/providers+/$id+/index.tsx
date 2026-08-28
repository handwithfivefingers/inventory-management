import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { FormProvider, useForm } from "react-hook-form";
import { providerService } from "~/action.server/provider.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
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
  return resp.data;
};

export const meta: MetaFunction = () => {
  return [{ title: "Chỉnh sửa nhà cung cấp" }, { name: "description", content: "Chỉnh sửa nhà cung cấp" }];
};

export default function ProviderItem() {
  const { data } = useLoaderData<typeof loader>();
  console.log("data", data);
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
    <div className="w-full flex flex-col p-2 gap-4">
      <CardItem title={t("providers.editTitle")} className="flex p-4">
        <FormProvider {...formMethods}>
          <form className="grid grid-cols-2 gap-x-2 gap-2" onSubmit={handleSubmit(onSubmit)}>
            <div className="col-span-2">
              <FormControl name="name">
                <TextInput label={t("providers.name")} />
              </FormControl>
            </div>
            <div className="col-span-1">
              <FormControl name="email">
                <TextInput label={t("providers.email")} />
              </FormControl>
            </div>
            <div className="col-span-1">
              <FormControl name="phone">
                <TextInput label={t("providers.phone")} />
              </FormControl>
            </div>
            <div className="col-span-2">
              <FormControl name="address">
                <TextInput label={t("providers.address")} />
              </FormControl>
            </div>

            <div className="col-span-2 ml-auto">
              <TMButton variant="light" htmlType="submit" loading={isLoading}>
                {t("common.save")}
              </TMButton>
            </div>
          </form>
        </FormProvider>
      </CardItem>
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
