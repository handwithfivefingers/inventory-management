import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useFetcher } from "@remix-run/react";
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
import { Icon } from "~/components/icon";
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
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="credit-card" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                    {t("financial.addVoucher")}
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">Tạo phiếu thu/chi mới</p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <FormProvider {...formMethods}>
            <form
              className="flex flex-col gap-5 mt-2"
              onSubmit={handleSubmit((v) =>
                fetcher.submit({ data: JSON.stringify(v) }, { method: "POST", action: "/financial/add" }),
              )}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormControl name="amount">
                  {(field) => (
                    <NumberInput
                      label={t("financial.amount")}
                      value={field.value as any}
                      onValueChange={(v) => field.onChange(v.value)}
                    />
                  )}
                </FormControl>
                <FormControl name="transactionDate">
                  {(field) => <DatePicker label={t("financial.date")} {...field} />}
                </FormControl>
              </div>
              <FormControl name="note">
                {(field) => (
                  <TextInput
                    label={t("financial.note")}
                    placeholder={t("financial.notePlaceholder", { defaultValue: "" })}
                    multiline
                    rows={3}
                    prefix={<Icon name="file-text" fontSize={16} className="text-slate-400" />}
                    {...field}
                  />
                )}
              </FormControl>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
                <TMButton variant="ghost" size="sm" component={Link} to="/financial" type="button">
                  {t("common.cancel")}
                </TMButton>
                <TMButton htmlType="submit" size="sm" loading={fetcher.state !== "idle"}>
                  <Icon name="save" fontSize={16} />
                  {t("common.save")}
                </TMButton>
              </div>
            </form>
          </FormProvider>
        </CardItem>
      </div>
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
