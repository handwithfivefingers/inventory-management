import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { vendorSettingService } from "~/action.server/setting.service";
import { DEFAULT_VENDOR_PROFILE } from "~/types/setting";
import type { IVendorProfile } from "~/types/setting";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { usePermission } from "~/hooks/use-permission";
import { useTranslation } from "~/i18n";
import { cn } from "~/libs/utils";
import { useUser } from "~/store/user.store";
import { useSubmitPromise } from "~/hooks";

export const meta: MetaFunction = () => {
  return [
    { title: "Vendor - Cài đặt" },
    { name: "description", content: "Hồ sơ cửa hàng: tên thương hiệu, pháp lý, thuế và tiền tố hóa đơn" },
  ];
};

/**
 * GET /setting/vendor
 * Load the vendor master-data profile for the active workspace vendor.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // const { cookie, vendorId } = await parseCookieFromRequest(request);
    const response = await vendorSettingService.getVendorSettings();
    const profile = (response as any)?.data?.data ?? (response as any)?.data ?? {};
    return { success: true, data: { profile: { ...DEFAULT_VENDOR_PROFILE, ...profile } } };
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error.message || "Không thể tải hồ sơ cửa hàng",
        data: { profile: DEFAULT_VENDOR_PROFILE },
      },
      { status: 400 },
    );
  }
}

/**
 * PUT /setting/vendor
 * Save the vendor master-data profile (backend enforces Owner / setting:U
 * and strict active-workspace isolation).
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const payload = JSON.parse((formData.get("payload") as string) || "{}");

    await vendorSettingService.updateVendorSettings(payload);
    const response = await vendorSettingService.getVendorSettings();
    const profile = response?.data?.data;
    return { success: true, message: "Đã lưu hồ sơ cửa hàng", data: profile };
  } catch (error: any) {
    return Response.json({
      success: false,
      message: error?.message || error?.toString?.() || "Lưu hồ sơ cửa hàng thất bại",
    });
  }
}

const SECTION_CARD = "bg-slate-50 dark:bg-slate-700/20 border border-slate-200 dark:border-slate-700 rounded-md p-4";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isValidPrefix = (value: string) => /^[A-Za-z0-9-]{1,20}$/.test(value.trim());

export default function VendorSettings() {
  const { data } = useLoaderData<typeof loader>();
  const { submit, isLoading } = useSubmitPromise();
  const { t } = useTranslation();
  const updateVendor = useUser((state) => state.updateVendor);
  const [form, setForm] = useState<IVendorProfile>(data?.profile || DEFAULT_VENDOR_PROFILE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const canUpdate = usePermission("UPDATE", "setting");

  // useEffect(() => {
  //   if (fetcher.state === "idle" && fetcher.data?.success) {
  //     toast.success({ title: "Thành công", message: "Đã lưu hồ sơ cửa hàng" });
  //     const profile = (fetcher.data as any)?.data?.profile as (IVendorProfile & { id?: number }) | undefined;
  //     if (profile?.id) updateVendor({ id: profile.id, name: profile.name || "" });
  //     setErrors({});
  //   } else if (fetcher.state === "idle" && fetcher.data && !fetcher.data.success) {
  //     toast.danger({ title: "Lỗi", message: (fetcher.data as any)?.message || "Lưu hồ sơ cửa hàng thất bại" });
  //   }
  // }, [fetcher.state, fetcher.data, updateVendor]);

  const update = (key: keyof IVendorProfile, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Live preview of the document fallback chain: legal_name -> name.
  const displayName = (form.legal_name?.trim() || form.name?.trim() || "—") as string;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name?.trim()) next.name = t("settings.vendor.nameRequired");
    const email = form.email?.trim() || "";
    if (email && !isValidEmail(email)) next.email = t("settings.vendor.emailInvalid");
    const prefix = form.invoice_series_prefix?.trim() || "";
    if (prefix && !isValidPrefix(prefix)) next.invoice_series_prefix = t("settings.vendor.prefixInvalid");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    // Empty strings become null server-side (clears the field); drop undefined.
    try {
      const payload: Record<string, unknown> = {};
      (["name", "legal_name", "tax_number", "address", "email", "phone", "invoice_series_prefix"] as const).forEach(
        (key) => {
          const value = (form as any)[key];
          if (value !== undefined) payload[key] = value;
        },
      );
      const response = await submit<{ success: boolean; profile: IVendorProfile }>(
        { payload: JSON.stringify(payload) },
        { method: "PUT" },
      );
      if (response.success) {
        if (response.profile?.id) updateVendor({ id: response.profile.id, name: response.profile.name || "" });
        toast.success({ title: "Thành công", message: "Đã lưu hồ sơ cửa hàng" });
      } else throw response;
    } catch (error) {
      toast.danger({ title: "Lỗi", message: "Lưu hồ sơ cửa hàng thất bại" });
    }
  };

  const readOnly = !canUpdate;

  return (
    <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem
        title={
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                <Icon name="home" fontSize={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                  {t("settings.vendor.title")}
                </h2>
                <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                  {t("settings.vendor.subtitle")}
                </p>
              </div>
            </div>
          </div>
        }
        action={
          canUpdate ? (
            <TMButton htmlType="submit" loading={isLoading} onClick={onSubmit} size="sm">
              <Icon name="save" fontSize={16} />
              {t("settings.vendor.save")}
            </TMButton>
          ) : undefined
        }
        className="flex flex-col w-full rounded-md bg-white shadow-2xl shadow-slate-200 gap-2 dark:bg-slate-800 dark:shadow-black/20 p-5 sm:p-6 h-full"
      >
        <div className="flex flex-col gap-4 overflow-auto scrollbar pr-1 sm:pr-4 min-h-0 flex-1">
          {/* Display-name preview (document fallback) */}
          <section className={SECTION_CARD}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-sm text-slate-500 dark:text-slate-400">{t("settings.vendor.displayName")}</span>
              <span className="text-base font-semibold text-slate-900 dark:text-white">{displayName}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("settings.vendor.displayNameHint")}</p>
          </section>

          {/* Brand & legal identity */}
          <section className={SECTION_CARD}>
            <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">{t("settings.vendor.identity")}</h4>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 sm:col-span-6">
                <TextInput
                  label={t("settings.vendor.brandName")}
                  value={form.name || ""}
                  onChange={(e: any) => update("name", e.target.value)}
                  placeholder="VD: Shop Hoa Tươi"
                  required
                  disabled={readOnly}
                  error={errors.name}
                />
              </div>
              <div className="col-span-12 sm:col-span-6">
                <TextInput
                  label={t("settings.vendor.legalName")}
                  value={form.legal_name || ""}
                  onChange={(e: any) => update("legal_name", e.target.value)}
                  placeholder="VD: CÔNG TY TNHH HOA TƯƠI"
                  disabled={readOnly}
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{t("settings.vendor.legalNameHint")}</p>
              </div>
              <div className="col-span-12 sm:col-span-6">
                <TextInput
                  label={t("settings.vendor.taxNumber")}
                  value={form.tax_number || ""}
                  onChange={(e: any) => update("tax_number", e.target.value)}
                  placeholder="VD: 0101234567"
                  disabled={readOnly}
                />
              </div>
              <div className="col-span-12 sm:col-span-6">
                <TextInput
                  label={t("settings.vendor.invoicePrefix")}
                  value={form.invoice_series_prefix || ""}
                  onChange={(e: any) => update("invoice_series_prefix", e.target.value)}
                  placeholder="VD: HD"
                  disabled={readOnly}
                  error={errors.invoice_series_prefix}
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  {t("settings.vendor.invoicePrefixHint")}
                </p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className={SECTION_CARD}>
            <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">{t("settings.vendor.contact")}</h4>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <TextInput
                  label={t("settings.vendor.address")}
                  value={form.address || ""}
                  onChange={(e: any) => update("address", e.target.value)}
                  placeholder="VD: 123 Nguyễn Huệ, Q.1, TP.HCM"
                  multiline
                  rows={2}
                  disabled={readOnly}
                />
              </div>
              <div className="col-span-12 sm:col-span-6">
                <TextInput
                  label={t("settings.vendor.email")}
                  value={form.email || ""}
                  onChange={(e: any) => update("email", e.target.value)}
                  placeholder="VD: contact@shop.vn"
                  disabled={readOnly}
                  error={errors.email}
                />
              </div>
              <div className="col-span-12 sm:col-span-6">
                <TextInput
                  label={t("settings.vendor.phone")}
                  value={form.phone || ""}
                  onChange={(e: any) => update("phone", e.target.value)}
                  placeholder="VD: 0901234567"
                  disabled={readOnly}
                />
              </div>
            </div>
          </section>

          {/* Immutability notice */}
          <p className={cn("text-xs text-slate-500 dark:text-slate-400")}>{t("settings.vendor.immutableNote")}</p>

          {!canUpdate && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("settings.vendor.readOnlyNote")}</p>
          )}
        </div>
      </CardItem>
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
