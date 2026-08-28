import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { FormProvider, useForm } from "react-hook-form";
import { providerService } from "~/action.server/provider.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { providerSchema, ProviderSchema } from "~/constants/schema/provider";
import { useSubmitPromise } from "~/hooks";
import { ResponseError } from "~/http";
import { useTranslation } from "~/i18n";

export const meta: MetaFunction = () => {
  return [{ title: "Thêm nhà cung cấp" }, { name: "description", content: "Thêm nhà cung cấp mới" }];
};

export default function ProviderAdd() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const formMethods = useForm<ProviderSchema>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
    resolver: zodResolver(providerSchema),
  });
  const { handleSubmit } = formMethods;
  const { submit, isLoading } = useSubmitPromise();
  const onSubmit = async (v: ProviderSchema) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp = await submit<any>({ data: JSON.stringify(v) }, { method: "POST" });
      if (resp?.status && Number(resp.status) >= 400) {
        const message = Array.isArray(resp?.error)
          ? resp.error.map((e: any) => `${e.path} ${e.msg}`).join(", ")
          : resp?.error ?? t("common.tryAgain");
        throw new ResponseError({ error: message, status: Number(resp.status) });
      }
      toast.success({ title: t("common.success"), message: t("providers.createSuccess") });
      navigate("/providers");
    } catch (error) {
      if (error instanceof ResponseError) {
        toast.danger({ title: t("common.error"), message: error.message });
      }
    }
  };
  return (
    <div className="w-full flex flex-col p-2 gap-4">
      <CardItem title={t("providers.addTitle")} className="p-4">
        <FormProvider {...formMethods}>
          <form className="grid grid-cols-2 gap-x-4 gap-2" onSubmit={handleSubmit(onSubmit)}>
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
            <div className="col-span-2 ">
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

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { cookie, vendorId } = await import("~/sessions").then((m) => m.parseCookieFromRequest(request));
    const formData = await request.formData();
    const data = JSON.parse(Object.fromEntries(formData)?.data as string);
    const resp = await providerService.create({ ...data, vendorId, cookie });
    return json(resp);
  } catch (error) {
    return json(
      { status: 400, error: (error as any)?.error?.errors ?? (error as any)?.message },
      { status: 400 },
    );
  }
};
