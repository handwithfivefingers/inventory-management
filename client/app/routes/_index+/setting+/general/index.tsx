import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, ICodeFormatMap, IVendorSettings, settingService } from "~/action.server/setting.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { CheckboxInput } from "~/components/form/checkbox-input";
import { NumberInput } from "~/components/form/number-input";
import { SelectInput } from "~/components/form/select-input";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { isLocale, useTranslation } from "~/i18n";
import { parseCookieFromRequest } from "~/sessions";
import { useLocale } from "~/store/locale.store";
import { applyTheme, isTheme, useTheme } from "~/store/theme.store";

export const meta: MetaFunction = () => {
  return [
    { title: "General - Cài đặt" },
    { name: "description", content: "Cài đặt chung cho cửa hàng: ngôn ngữ, giao diện, tiền tệ, mã hàng..." },
  ];
};

/**
 * GET /setting/general
 * Load the vendor settings
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { cookie, vendorId } = await parseCookieFromRequest(request);
    const settings = await settingService.getSettings({ cookie, vendorId });
    return { success: true, data: { settings: { ...DEFAULT_SETTINGS, ...settings } } };
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error.message || "Không thể tải cài đặt",
        data: { settings: DEFAULT_SETTINGS },
      },
      { status: 400 },
    );
  }
}

/**
 * PUT /setting/general
 * Save the vendor settings
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { cookie, vendorId } = await parseCookieFromRequest(request);
    const formData = await request.formData();
    const payload = JSON.parse((formData.get("payload") as string) || "{}");

    const settings = await settingService.updateSettings({
      cookie,
      vendorId,
      ...payload,
    });

    return {
      success: true,
      message: "Đã lưu cài đặt",
      data: { settings },
    };
  } catch (error) {
    return Response.json({
      success: false,
      message: error?.toString || "Lưu cài đặt thất bại",
    });
  }
}

const LANGUAGE_OPTIONS = [
  { label: "Tiếng Việt", value: "vi" },
  { label: "English", value: "en" },
];

const THEME_OPTIONS = [
  { label: "Hệ thống", value: "system" },
  { label: "Sáng", value: "light" },
  { label: "Tối", value: "dark" },
];

const MONEY_POSITION_OPTIONS = [
  { label: "Sau số tiền (1.000.000đ)", value: "suffix" },
  { label: "Trước số tiền (đ1.000.000)", value: "prefix" },
];

const CODE_ENTITY_LABELS: Record<keyof ICodeFormatMap, string> = {
  order: "Mã đơn hàng",
  customer: "Mã khách hàng",
  product: "Mã sản phẩm",
  category: "Mã danh mục",
};

export default function GeneralSettings() {
  const { data } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const { t } = useTranslation();
  const [form, setForm] = useState<IVendorSettings>(data?.settings || DEFAULT_SETTINGS);
  const setThemeStore = useTheme((s) => s.setTheme);
  const setLocaleStore = useLocale((s) => s.setLocale);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      toast.success({ title: "Thành công", message: "Đã lưu cài đặt" });
      const saved = (fetcher.data as any)?.data?.settings;
      // Apply language & theme immediately
      if (isTheme(saved?.theme)) {
        setThemeStore(saved.theme);
        applyTheme(saved.theme);
      }
      if (isLocale(saved?.language)) {
        setLocaleStore(saved.language);
      }
    } else if (fetcher.state === "idle" && fetcher.data && !fetcher.data.success) {
      toast.danger({ title: "Lỗi", message: (fetcher.data as any)?.message || "Lưu cài đặt thất bại" });
    }
  }, [fetcher.state, fetcher.data]);

  const update = <K extends keyof IVendorSettings>(key: K, value: IVendorSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateCodeFormat = (map: "codePrefix" | "codeSuffix", entity: keyof ICodeFormatMap, value: string) =>
    setForm((prev) => ({
      ...prev,
      [map]: { ...(prev[map] || {}), [entity]: value },
    }));

  const onSubmit = () => {
    fetcher.submit({ payload: JSON.stringify(form) }, { method: "PUT" });
  };

  const isLoading = fetcher.state !== "idle";

  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem
        title={
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                <Icon name="settings" fontSize={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">Cài đặt chung</h2>
                <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                  Cài đặt chung cho cửa hàng
                </p>
              </div>
            </div>
          </div>
        }
        action={
          <TMButton htmlType="submit" loading={isLoading} onClick={onSubmit} size="sm">
            <Icon name="save" fontSize={16} />
            Lưu cài đặt
          </TMButton>
        }
        className="flex flex-col w-full rounded-md dark:bg-slate-500 bg-white shadow-2xl shadow-slate-200 gap-2 dark:shadow-slate-600 p-5 sm:p-6 h-full "
      >
        <div className="flex flex-col gap-6 overflow-auto scrollbar pr-4 ">
          {/* Language / Theme */}
          <section>
            <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">Ngôn ngữ & Giao diện</h4>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6">
                <SelectInput
                  label="Ngôn ngữ"
                  options={LANGUAGE_OPTIONS}
                  value={form.language}
                  onSelect={(v: any) => update("language", v)}
                />
              </div>
              <div className="col-span-6">
                <SelectInput
                  label="Giao diện"
                  options={THEME_OPTIONS}
                  value={form.theme}
                  onSelect={(v: any) => update("theme", v)}
                />
              </div>
            </div>
          </section>

          {/* Money unit */}
          <section>
            <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">Đơn vị tiền</h4>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6">
                <TextInput
                  label="Ký hiệu tiền tệ"
                  value={form.moneyUnit}
                  onChange={(e: any) => update("moneyUnit", e.target.value)}
                  placeholder="VND, USD..."
                />
              </div>
              <div className="col-span-6">
                <SelectInput
                  label="Vị trí ký hiệu"
                  options={MONEY_POSITION_OPTIONS}
                  value={form.moneyUnitPosition}
                  onSelect={(v: any) => update("moneyUnitPosition", v)}
                />
              </div>
              <div className="col-span-6">
                <NumberInput
                  label={t("settings.moneyStep")}
                  value={form.moneyStep as any}
                  onValueChange={(v: any) => update("moneyStep", Number(v.value || 0))}
                />
                <p className="text-xs text-gray-500 mt-1">{t("settings.moneyStepHint")}</p>
              </div>
            </div>
          </section>

          {/* SKU template */}
          <section>
            <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-1">Mẫu SKU</h4>
            <p className="text-sm text-gray-500 mb-3">
              Các biến khả dụng: {"{CODE}"} mã sản phẩm, {"{SEQ}"} số thứ tự, {"{CATEGORY}"} danh mục, {"{YYYY}"} năm
            </p>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6">
                <TextInput
                  label="Template"
                  value={form.skuTemplate}
                  onChange={(e: any) => update("skuTemplate", e.target.value)}
                  placeholder="{CODE}-{SEQ}"
                />
              </div>
            </div>
          </section>

          {/* Prefix / Suffix per code */}
          <section>
            <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">
              Tiền tố / Hậu tố mã (Prefix / Suffix)
            </h4>
            {[
              ["codePrefix", "Tiền tố"],
              ["codeSuffix", "Hậu tố"],
            ].map(([mapKey, mapLabel]) => (
              <div key={mapKey} className="mb-4">
                <h5 className="text-sm font-medium text-gray-600 dark:text-slate-300 mb-2">{mapLabel}</h5>
                <div className="grid grid-cols-12 gap-4">
                  {(Object.keys(CODE_ENTITY_LABELS) as (keyof ICodeFormatMap)[]).map((entity) => (
                    <div className="col-span-6 lg:col-span-3" key={`${mapKey}-${entity}`}>
                      <TextInput
                        label={CODE_ENTITY_LABELS[entity]}
                        value={(form as any)[mapKey]?.[entity] || ""}
                        onChange={(e: any) => updateCodeFormat(mapKey as any, entity, e.target.value)}
                        placeholder="VD: PO-"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section>
            <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">Vận chuyển (Ship)</h4>
            <div className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-6 lg:col-span-3 pb-2">
                <CheckboxInput
                  label="Bật tính phí ship"
                  checked={!!form.shipDelivery?.enabled}
                  onChange={(e: any) =>
                    update("shipDelivery", { ...(form.shipDelivery || {}), enabled: e.target.checked })
                  }
                />
              </div>
              <div className="col-span-6 lg:col-span-3">
                <NumberInput
                  label="Phí ship mặc định"
                  value={form.shipDelivery?.fee as any}
                  onValueChange={(v: any) =>
                    update("shipDelivery", { ...(form.shipDelivery || {}), fee: Number(v.value || 0) })
                  }
                />
              </div>
              <div className="col-span-6 lg:col-span-3">
                <NumberInput
                  label="Miễn phí ship từ"
                  value={form.shipDelivery?.freeThreshold as any}
                  onValueChange={(v: any) =>
                    update("shipDelivery", {
                      ...(form.shipDelivery || {}),
                      freeThreshold: v.value ? Number(v.value) : null,
                    })
                  }
                />
              </div>
            </div>
          </section>

          {/* Tax config */}
          <section>
            <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">Thuế & Phụ thu (%)</h4>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4">
                <NumberInput
                  label="VAT mặc định (%)"
                  value={form.defaultTaxRate as any}
                  onValueChange={(v: any) => update("defaultTaxRate", Number(v.value || 0))}
                />
              </div>
              <div className="col-span-4">
                <NumberInput
                  label="Chiết khấu mặc định"
                  value={form.defaultDiscount as any}
                  onValueChange={(v: any) => update("defaultDiscount", Number(v.value || 0))}
                />
              </div>
              <div className="col-span-4">
                <NumberInput
                  label="Phụ thu mặc định"
                  value={form.defaultSurcharge as any}
                  onValueChange={(v: any) => update("defaultSurcharge", Number(v.value || 0))}
                />
              </div>
            </div>
          </section>
        </div>
      </CardItem>
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
