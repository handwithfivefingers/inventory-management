import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SETTINGS, ICodeFormatMap, IVendorSettings, settingService } from "~/action.server/setting.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { SwitchInput } from "~/components/form/switch-input";
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
import { useIsAdmin } from "~/hooks/use-permission";
import {
  applyNicheTheme,
  NICHE_DEFAULT_HIDDEN,
  NICHE_PRESETS,
  NICHE_SIDEBAR_TOGGLES,
  resolveHiddenSidebar,
} from "~/libs/niche-theme";
import type { IAppearanceConfig } from "~/action.server/setting.service";
import { cn } from "~/libs/utils";

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
    // Suffix setting removed from UI: drop it server-side too so stale values don't linger.
    if (payload && typeof payload === "object" && "codeSuffix" in payload) delete payload.codeSuffix;

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

const SECTION_CARD = "bg-slate-50 dark:bg-slate-700/20 border border-slate-200 dark:border-slate-700 rounded-md p-4";

export default function GeneralSettings() {
  const { data } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const { t } = useTranslation();
  const [form, setForm] = useState<IVendorSettings>(data?.settings || DEFAULT_SETTINGS);
  const [tab, setTab] = useState<"general" | "niche">("general");
  const setThemeStore = useTheme((s) => s.setTheme);
  const setLocaleStore = useLocale((s) => s.setLocale);
  const isAdmin = useIsAdmin();

  // PUT returns `{ status }` only (no payload), so the just-submitted form
  // snapshot is the source of truth for post-save side effects below.
  const submittedRef = useRef<IVendorSettings | null>(null);

  // The inner list scrolls; toggling a control re-renders the page and must
  // never move the scroll. Only an explicit tab switch resets to top.
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const tabRef = useRef(tab);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (tabRef.current !== tab) {
      tabRef.current = tab;
      scrollTopRef.current = 0;
      el.scrollTop = 0;
    } else if (el.scrollTop !== scrollTopRef.current) {
      el.scrollTop = scrollTopRef.current;
    }
  });

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      toast.success({ title: "Thành công", message: "Đã lưu cài đặt" });
      const submitted = submittedRef.current;
      submittedRef.current = null;
      if (submitted) {
        // Apply language & theme immediately
        if (isTheme(submitted.theme)) {
          setThemeStore(submitted.theme);
          applyTheme(submitted.theme);
        }
        if (isLocale(submitted.language)) {
          setLocaleStore(submitted.language);
        }
        // Re-apply the niche theme from what was actually saved so the
        // sidebar/bottom-nav refresh with the correct hidden list.
        applyNicheTheme(submitted.appearance as any);
        // Normalize local state to the saved payload (also purges codeSuffix).
        setForm({ ...submitted });
      }
    } else if (fetcher.state === "idle" && fetcher.data && !fetcher.data.success) {
      toast.danger({ title: "Lỗi", message: (fetcher.data as any)?.message || "Lưu cài đặt thất bại" });
    }
  }, [fetcher.state, fetcher.data]);

  const update = <K extends keyof IVendorSettings>(key: K, value: IVendorSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateAppearance = (patch: Partial<IAppearanceConfig>) =>
    setForm((prev) => ({ ...prev, appearance: { ...(prev.appearance || {}), ...patch } }));

  const NICHE_OPTIONS = useMemo(
    () => [...Object.values(NICHE_PRESETS).map((p) => ({ label: p.label, value: p.key }))],
    [],
  );

  const updateCodeFormat = (entity: keyof ICodeFormatMap, value: string) =>
    setForm((prev) => ({
      ...prev,
      codePrefix: { ...(prev.codePrefix || {}), [entity]: value },
    }));

  const hiddenList = useMemo(
    () => resolveHiddenSidebar(form.appearance as any),
    [form.appearance?.preset, JSON.stringify((form.appearance as any)?.sidebarHidden)],
  );

  const toggleSidebarKey = (key: string, show: boolean) => {
    const current = new Set(resolveHiddenSidebar(form.appearance as any));
    if (show) current.delete(key);
    else current.add(key);
    updateAppearance({ sidebarHidden: [...current] });
  };

  const onSubmit = () => {
    const payload: any = { ...form };
    delete payload.codeSuffix;
    submittedRef.current = payload;
    fetcher.submit({ payload: JSON.stringify(payload) }, { method: "PUT" });
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
        className="flex flex-col w-full rounded-md bg-white shadow-2xl shadow-slate-200 gap-2 dark:bg-slate-800 dark:shadow-black/20 p-5 sm:p-6 h-full "
      >
        {/* Tabs: general vs niche theme */}
        <div className="flex gap-1 shrink-0 rounded-md bg-slate-100 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 p-1 w-fit">
          {[
            { value: "general", label: "Cài đặt chung" },
            { value: "niche", label: "Giao diện theo ngành hàng" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value as any)}
              className={cn(
                "px-4 py-1.5 text-sm rounded-md transition-colors cursor-pointer",
                tab === item.value
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-medium"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          ref={scrollRef}
          onScroll={(e) => {
            scrollTopRef.current = e.currentTarget.scrollTop;
          }}
          className="flex flex-col gap-4 overflow-auto scrollbar pr-1 sm:pr-4 min-h-0 flex-1"
        >
          {tab === "general" ? (
            <>
              {/* Language / Theme */}
              <section className={SECTION_CARD}>
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">Ngôn ngữ & Giao diện</h4>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 sm:col-span-6">
                    <SelectInput
                      label="Ngôn ngữ"
                      options={LANGUAGE_OPTIONS}
                      value={form.language}
                      onSelect={(v: any) => {
                        update("language", v);
                        // Apply immediately so the UI reacts without saving/reloading
                        if (isLocale(v)) setLocaleStore(v);
                      }}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-6">
                    <SelectInput
                      label="Giao diện"
                      options={THEME_OPTIONS}
                      value={form.theme}
                      onSelect={(v: any) => {
                        update("theme", v);
                        // Apply immediately so the UI reacts without saving/reloading
                        if (isTheme(v)) {
                          setThemeStore(v);
                          applyTheme(v);
                        }
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* Money unit */}
              <section className={SECTION_CARD}>
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">Đơn vị tiền</h4>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 sm:col-span-6">
                    <TextInput
                      label="Ký hiệu tiền tệ"
                      value={form.moneyUnit}
                      onChange={(e: any) => update("moneyUnit", e.target.value)}
                      placeholder="VND, USD..."
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-6">
                    <SelectInput
                      label="Vị trí ký hiệu"
                      options={MONEY_POSITION_OPTIONS}
                      value={form.moneyUnitPosition}
                      onSelect={(v: any) => update("moneyUnitPosition", v)}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-6">
                    <NumberInput
                      label={t("settings.moneyStep")}
                      value={form.moneyStep as any}
                      onValueChange={(v: any) => update("moneyStep", Number(v.value || 0))}
                    />
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{t("settings.moneyStepHint")}</p>
                  </div>
                </div>
              </section>

              {/* SKU template */}
              <section className={SECTION_CARD}>
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-1">Mẫu SKU</h4>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  Các biến khả dụng: {"{CODE}"} mã sản phẩm, {"{SEQ}"} số thứ tự, {"{CATEGORY}"} danh mục, {"{YYYY}"}{" "}
                  năm
                </p>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 sm:col-span-6">
                    <TextInput
                      label="Template"
                      value={form.skuTemplate}
                      onChange={(e: any) => update("skuTemplate", e.target.value)}
                      placeholder="{CODE}-{SEQ}"
                    />
                  </div>
                </div>
              </section>

              {/* Prefix per code (suffix removed) */}
              <section className={SECTION_CARD}>
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">Tiền tố mã (Prefix)</h4>
                <div className="grid grid-cols-12 gap-4">
                  {(Object.keys(CODE_ENTITY_LABELS) as (keyof ICodeFormatMap)[]).map((entity) => (
                    <div className="col-span-12 sm:col-span-6 lg:col-span-3" key={`codePrefix-${entity}`}>
                      <TextInput
                        label={CODE_ENTITY_LABELS[entity]}
                        value={(form as any).codePrefix?.[entity] || ""}
                        onChange={(e: any) => updateCodeFormat(entity, e.target.value)}
                        placeholder="VD: PO-"
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className={SECTION_CARD}>
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">Vận chuyển (Ship)</h4>
                <div className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-12 sm:col-span-4 lg:col-span-3 pb-2">
                    <SwitchInput
                      label="Bật tính phí ship"
                      checked={!!form.shipDelivery?.enabled}
                      onChange={(e: any) =>
                        update("shipDelivery", { ...(form.shipDelivery || {}), enabled: e.target.checked })
                      }
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                    <NumberInput
                      label="Phí ship mặc định"
                      value={form.shipDelivery?.fee as any}
                      onValueChange={(v: any) =>
                        update("shipDelivery", { ...(form.shipDelivery || {}), fee: Number(v.value || 0) })
                      }
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3">
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
              <section className={SECTION_CARD}>
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">Thuế & Phụ thu (%)</h4>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 sm:col-span-4">
                    <NumberInput
                      label="VAT mặc định (%)"
                      value={form.defaultTaxRate as any}
                      onValueChange={(v: any) => update("defaultTaxRate", Number(v.value || 0))}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <NumberInput
                      label="Chiết khấu mặc định"
                      value={form.defaultDiscount as any}
                      onValueChange={(v: any) => update("defaultDiscount", Number(v.value || 0))}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <NumberInput
                      label="Phụ thu mặc định"
                      value={form.defaultSurcharge as any}
                      onValueChange={(v: any) => update("defaultSurcharge", Number(v.value || 0))}
                    />
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              {/* Niche appearance */}
              <section className={SECTION_CARD}>
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-1">Giao diện theo ngành hàng</h4>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  Chọn preset theo lĩnh vực của bạn — màu chủ đạo và thuật ngữ sẽ thay đổi theo. Có thể tùy biến thủ
                  công.
                </p>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                    <SelectInput
                      label="Ngành hàng (niche)"
                      options={NICHE_OPTIONS}
                      value={form.appearance?.preset || "fashion"}
                      onSelect={(v: any) => updateAppearance({ preset: String(v) })}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                    <TextInput
                      label="Màu chủ đạo (CSS color)"
                      value={form.appearance?.primaryColor || ""}
                      onChange={(e: any) => updateAppearance({ primaryColor: e.target.value })}
                      placeholder="Ví dụ: oklch(51.1% 0.262 276.966) hoặc #4f46e5"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                    <TextInput
                      label="Màu nhấn"
                      value={form.appearance?.accentColor || ""}
                      onChange={(e: any) => updateAppearance({ accentColor: e.target.value })}
                      placeholder="#14b8a6"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                    <TextInput
                      label="Logo URL"
                      value={form.appearance?.logoUrl || ""}
                      onChange={(e: any) => updateAppearance({ logoUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="col-span-12">
                    <TextInput
                      label={'Thuật ngữ riêng (JSON, ví dụ: {"sidebar.products": "Món ăn"})'}
                      value={JSON.stringify(form.appearance?.terminology || {})}
                      onChange={(e: any) => {
                        try {
                          updateAppearance({ terminology: JSON.parse(e.target.value || "{}") });
                        } catch {
                          /* keep typing - invalid JSON ignored until valid */
                        }
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* Sidebar visibility (admin only, FE-only hiding) */}
              <section className={SECTION_CARD}>
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-1">Sidebar hiển thị</h4>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  Ẩn các mục không cần thiết ở FE (ví dụ shop thời trang {"<"} 2 người không cần Nhân viên / Chốt ca).
                  Chỉ ẩn hiển thị — phân quyền backend giữ nguyên. Route vẫn code-split theo Remix nên không tải thừa.
                </p>
                {!isAdmin ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Chỉ quản trị viên (admin) mới được thay đổi mục này.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {NICHE_SIDEBAR_TOGGLES.map((item) => {
                      const hidden = hiddenList.includes(item.key);
                      return (
                        <div key={item.key} className="flex items-center justify-between gap-3">
                          <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                          <SwitchInput
                            label={hidden ? "Đang ẩn" : "Đang hiện"}
                            checked={!hidden}
                            onChange={(e: any) => toggleSidebarKey(item.key, e.target.checked)}
                          />
                        </div>
                      );
                    })}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Mặc định preset “{form.appearance?.preset || "fashion"}”:{" "}
                      {(NICHE_DEFAULT_HIDDEN[form.appearance?.preset || "fashion"] || []).join(", ") || "hiện tất cả"}.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </CardItem>
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
