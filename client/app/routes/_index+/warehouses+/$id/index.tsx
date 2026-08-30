import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData, useNavigate, useRevalidator } from "@remix-run/react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { warehouseService } from "~/action.server/warehouse.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { CheckboxInput } from "~/components/form/checkbox-input";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { warehouseSchema, WarehouseSchema } from "~/constants/schema/warehouse";
import { useSubmitPromise } from "~/hooks";
import { ResponseError } from "~/http";
import { useTranslation } from "~/i18n";
import { dayjs } from "~/libs/date";
import { parseCookieFromRequest } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { id } = params;
  if (!id) return redirect("/warehouses");
  const { vendorId, cookie } = await parseCookieFromRequest(request);
  const resp = await warehouseService.getWareHouseById({ id, vendorId, cookie });
  if (resp.status !== 200) throw new Response("Warehouse not found", { status: resp.status });
  return resp.data?.data;
};

export const meta: MetaFunction = () => {
  return [{ title: "Thông tin kho hàng" }, { name: "description", content: "Thông tin kho hàng" }];
};

export default function WarehouseItem() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const { submit: submitMain, isLoading: isMainLoading } = useSubmitPromise();
  const isMain = !!data?.isMain;

  const handleSetMain = async () => {
    try {
      const payload = isMain ? { isMain: false } : { isMain: true };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp = await submitMain<any>({ data: JSON.stringify(payload) }, { method: "PUT" });
      const status = resp?.status ?? resp?.data?.status;
      if (status && Number(status) >= 400) {
        const msg = resp?.error ?? resp?.message ?? t("common.tryAgain");
        throw new ResponseError({ error: msg, status: Number(status) });
      }
      // Some HTTP service returns {status:200} without body on PUT
      toast.success({ title: t("common.success"), message: t("warehouses.mainSuccess") });
      revalidator.revalidate();
    } catch (e: any) {
      const msg = e instanceof ResponseError ? e.message : e?.message ?? t("common.tryAgain");
      toast.danger({ title: t("common.error"), message: msg });
    }
  };

  if (!data) return <div className="p-4">{t("warehouses.notFound")}</div>;

  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link to="/warehouses" className="inline-flex items-center gap-1 hover:text-primary transition-colors">
          <Icon name="arrow-left" fontSize={16} />
          {t("warehouses.backToList")}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-[200px]">{data.name}</span>
      </div>

      <div className="max-w-3xl w-full mx-auto flex flex-col gap-3">
        <CardItem
          title={
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="home" fontSize={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white truncate flex items-center gap-2">
                    {isEditing ? t("warehouses.editTitle") : data.name}
                    {!isEditing && isMain && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Icon name="star" fontSize={12} />
                        {t("warehouses.isMainBadge")}
                      </span>
                    )}
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 truncate">
                    {isEditing ? t("warehouses.formHint") : data.address || t("warehouses.detailTitle")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isEditing && !isMain && (
                  <TMButton
                    variant="light"
                    size="sm"
                    onClick={handleSetMain}
                    loading={isMainLoading}
                    className="hidden sm:inline-flex"
                  >
                    <Icon name="star" fontSize={14} />
                    {t("warehouses.setAsMain")}
                  </TMButton>
                )}
                {!isEditing && isMain && (
                  <TMButton variant="ghost" size="sm" onClick={handleSetMain} loading={isMainLoading}>
                    <Icon name="star" fontSize={14} />
                    {t("warehouses.unsetMain")}
                  </TMButton>
                )}
                <TMButton
                  variant={isEditing ? "ghost" : "primary"}
                  size="sm"
                  onClick={() => setIsEditing((v) => !v)}
                >
                  <Icon name={isEditing ? "x" : "edit-2"} fontSize={14} />
                  {isEditing ? t("warehouses.cancelEdit") : t("warehouses.edit")}
                </TMButton>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          {!isEditing ? (
            <Detail data={data} onSetMain={handleSetMain} isMainLoading={isMainLoading} />
          ) : (
            <EditForm
              data={data}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => {
                setIsEditing(false);
                revalidator.revalidate();
              }}
            />
          )}
        </CardItem>

        {!isEditing && !isMain && (
          <div className="sm:hidden">
            <TMButton
              variant="light"
              size="sm"
              onClick={handleSetMain}
              loading={isMainLoading}
              className="w-full justify-center"
            >
              <Icon name="star" fontSize={14} />
              {t("warehouses.setAsMain")}
            </TMButton>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({
  data,
  onSetMain,
  isMainLoading,
}: {
  data: any;
  onSetMain: () => void;
  isMainLoading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-5 mt-1">
      <div className="grid grid-cols-1 gap-4">
        <InfoRow
          icon="home"
          label={t("warehouses.nameLabel")}
          value={data.name}
          valueClassName="font-semibold text-slate-900 dark:text-white"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon="phone" label={t("warehouses.phone")} value={data.phone || "-"} />
          <InfoRow icon="mail" label={t("warehouses.email")} value={data.email || "-"} />
        </div>
        <InfoRow icon="map-pin" label={t("warehouses.address")} value={data.address || "-"} multiline />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow
            icon="calendar"
            label={t("common.createdAt")}
            value={data.createdAt ? dayjs(data.createdAt).format("DD/MM/YYYY HH:mm") : "-"}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Icon name="star" fontSize={14} className="text-slate-400" />
              {t("warehouses.isMain")}
            </span>
            <div>
              {data.isMain ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <Icon name="check-circle" fontSize={14} />
                  {t("warehouses.isMainBadge")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  <Icon name="circle" fontSize={14} />
                  —
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">{t("warehouses.isMainHint")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  multiline,
  valueClassName,
}: {
  icon: string;
  label: string;
  value: string;
  multiline?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Icon name={icon} fontSize={14} className="text-slate-400" />
        {label}
      </span>
      <div
        className={`text-sm px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 break-words ${multiline ? "min-h-[56px] whitespace-pre-wrap" : ""} ${valueClassName ?? ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function EditForm({ data, onCancel, onSuccess }: { data: any; onCancel: () => void; onSuccess: () => void }) {
  const { t } = useTranslation();
  const { submit, isLoading } = useSubmitPromise();

  const formMethods = useForm<WarehouseSchema>({
    values: {
      name: data.name ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      address: data.address ?? "",
      isMain: !!data.isMain,
    },
    resolver: zodResolver(warehouseSchema),
  });

  const { handleSubmit } = formMethods;

  const onSubmit = async (v: WarehouseSchema) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp = await submit<any>({ data: JSON.stringify(v) }, { method: "PUT" });
      const status = resp?.status ?? 200;
      if (status && Number(status) >= 400) {
        const msg = Array.isArray(resp?.error)
          ? resp.error.map((e: any) => `${e.path} ${e.msg}`).join(", ")
          : resp?.error ?? resp?.message ?? t("common.tryAgain");
        throw new ResponseError({ error: msg, status: Number(status) });
      }
      toast.success({ title: t("common.success"), message: t("warehouses.updateSuccess") });
      onSuccess();
    } catch (error: any) {
      const msg = error instanceof ResponseError ? error.message : error?.message ?? t("common.tryAgain");
      toast.danger({ title: t("common.error"), message: msg });
    }
  };

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 mt-1">
        <FormControl name="name">
          <TextInput
            label={t("warehouses.nameLabel")}
            placeholder={t("warehouses.namePlaceholder")}
            required
            prefix={<Icon name="home" fontSize={16} className="text-slate-400" />}
          />
        </FormControl>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormControl name="phone">
            <TextInput
              label={t("warehouses.phone")}
              placeholder={t("warehouses.phonePlaceholder")}
              prefix={<Icon name="phone" fontSize={16} className="text-slate-400" />}
            />
          </FormControl>
          <FormControl name="email">
            <TextInput
              label={t("warehouses.email")}
              placeholder={t("warehouses.emailPlaceholder")}
              prefix={<Icon name="mail" fontSize={16} className="text-slate-400" />}
            />
          </FormControl>
        </div>

        <FormControl name="address">
          <TextInput
            label={t("warehouses.address")}
            placeholder={t("warehouses.addressPlaceholder")}
            multiline
            rows={3}
          />
        </FormControl>

        <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-900/10 dark:border-amber-800 p-4 flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-300">
            <Icon name="star" fontSize={16} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("warehouses.isMain")}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("warehouses.isMainHint")}</p>
              </div>
              <FormControl name="isMain" className="!gap-0">
                {(field) => (
                  <CheckboxInput
                    value={!!field.value}
                    onChange={(e: any) => field.onChange(e?.target ? e.target.checked : !!e)}
                  />
                )}
              </FormControl>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <TMButton variant="ghost" size="sm" type="button" onClick={onCancel}>
            {t("common.cancel")}
          </TMButton>
          <TMButton htmlType="submit" loading={isLoading} size="sm">
            <Icon name="save" fontSize={16} />
            {isLoading ? t("warehouses.saving") : t("common.save")}
          </TMButton>
        </div>
      </form>
    </FormProvider>
  );
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  try {
    const { vendorId, cookie } = await parseCookieFromRequest(request);
    const formData = await request.formData();
    const raw = Object.fromEntries(formData)?.data as string;
    const data = JSON.parse(raw);
    const resp = await warehouseService.updateWarehouse({ ...data, id: params.id as string, vendorId, cookie });
    // warehouseService.put returns {status:200} on success, no data wrapper
    // Normalize to shape expected by useSubmitPromise
    if ((resp as any)?.status && Number((resp as any).status) >= 400) {
      return json(resp, { status: Number((resp as any).status) });
    }
    return json({ status: 200, data: resp });
  } catch (error: any) {
    return json({ status: 400, error: error?.message ?? "Update failed" }, { status: 400 });
  }
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}
