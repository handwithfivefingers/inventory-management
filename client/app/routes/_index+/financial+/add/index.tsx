import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { financialService } from "~/action.server/financial.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { DatePicker } from "~/components/form/date-picker";
import { NumberInput } from "~/components/form/number-input";
import { SelectInput } from "~/components/form/select-input";
import { TextInput } from "~/components/form/text-input";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { financialSchema } from "~/constants/schema/financial";
import { parseCookieFromRequest } from "~/sessions";
import { useTranslation } from "~/i18n";

export const meta: MetaFunction = () => {
  return [{ title: "Tạo phiếu" }, { name: "description", content: "Tạo phiếu thu/chi" }];
};

export default function FinancialAdd() {
  const fetcher = useFetcher();
  const { t } = useTranslation();
  const formMethods = useForm({
    defaultValues: {
      type: "revenue",
      category: "other",
      amount: 0,
      note: "",
      transactionDate: new Date().toISOString().slice(0, 10),
    },
    resolver: zodResolver(financialSchema),
  });
  const { handleSubmit, control } = formMethods;

  useEffect(() => {
    if (fetcher.state === "idle" && (fetcher.data as any)?.status === 200) {
      toast.success({ title: "Thành công", message: "Tạo phiếu thành công" });
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title={t("financial.addVoucher")} className="p-4">
        <FormProvider {...formMethods}>
          <form
            className="grid grid-cols-2 gap-x-4 gap-2"
            onSubmit={handleSubmit((v) =>
              fetcher.submit(
                { data: JSON.stringify(v) },
                { method: "POST", action: "/financial/add" }
              )
            )}
          >
            <div className="col-span-1">
              <FormControl name="type">
                {(field) => (
                  <SelectInput
                    label={t("financial.type")}
                    options={[
                      { label: t("financial.revenue"), value: "revenue" },
                      { label: t("financial.expense"), value: "expense" },
                    ]}
                    {...field}
                    onSelect={(v) => field.onChange(v)}
                  />
                )}
              </FormControl>
            </div>
            <div className="col-span-1">
              <FormControl name="category">
                {(field) => (
                  <SelectInput
                    label={t("financial.category")}
                    options={[
                      { label: t("financial.revenue"), value: "sale" },
                      { label: t("financial.importCost"), value: "import" },
                      { label: t("staff.salary"), value: "salary" },
                      { label: "Rent", value: "rent" },
                      { label: t("common.other"), value: "other" },
                    ]}
                    {...field}
                    onSelect={(v) => field.onChange(v)}
                  />
                )}
              </FormControl>
            </div>
            <div className="col-span-1">
              <FormControl name="amount">
                {(field) => (
                  <NumberInput label={t("financial.amount")} value={field.value as any} onValueChange={(v) => field.onChange(v.value)} />
                )}
              </FormControl>
            </div>
            <div className="col-span-1">
              <FormControl name="transactionDate">
                {(field) => <DatePicker label={t("financial.date")} {...field} />}
              </FormControl>
            </div>
            <div className="col-span-2">
              <FormControl name="note">{(field) => <TextInput label={t("financial.note")} {...field} />}</FormControl>
            </div>
            <div className="col-span-2 ml-auto">
              <TMButton variant="light" htmlType="submit">
                {t("common.save")}
              </TMButton>
            </div>
          </form>
        </FormProvider>
      </CardItem>
    </div>
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { cookie, vendorId } = await parseCookieFromRequest(request);
    const form = await request.formData();
    const data = form.get("data") as string;
    const resp = await financialService.createVoucher(JSON.parse(data), { cookie, vendorId });
    return resp;
  } catch (error) {
    return { status: 400, error: (error as any).message };
  }
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}
