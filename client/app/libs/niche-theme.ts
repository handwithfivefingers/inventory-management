/**
 * Niche-based UI customization.
 *
 * A vendor's `appearance` settings carry:
 *   - `preset`: one of the NICHE_PRESETS keys (or "custom")
 *   - `primaryColor` / `accentColor`: manual overrides
 *   - `logoUrl`: brand logo shown in the sidebar
 *   - `terminology`: label overrides per niche (e.g. food: "Sản phẩm" -> "Món")
 *
 * Colors flow into the app through CSS variables consumed by Tailwind:
 * tailwind.css maps `--color-primary` so overriding the variable at runtime
 * recolors `text-primary`, `bg-primary`, etc. everywhere.
 */

export interface INichePreset {
  key: string;
  label: string;
  /** oklch or hex - applied to --color-primary */
  primary: string;
  /** oklch or hex - applied to --color-accent */
  accent: string;
  /** Sidebar/header tint background */
  headerBg: string;
  /** Label overrides: i18n key suffix -> replacement */
  terminology: Record<string, string>;
}

export const NICHE_PRESETS: Record<string, INichePreset> = {
  fashion: {
    key: "fashion",
    label: "Thời trang",
    primary: "oklch(51.1% 0.262 276.966)",
    accent: "oklch(70.4% 0.14 182.503)",
    headerBg: "bg-indigo-50",
    terminology: {},
  },
  food: {
    key: "food",
    label: "F&B / Nhà hàng",
    primary: "oklch(64.6% 0.222 41.116)",
    accent: "oklch(72.3% 0.219 149.579)",
    headerBg: "bg-orange-50",
    terminology: { "sidebar.products": "Món ăn", "sidebar.orders": "Gọi món", "product.add": "Thêm món" },
  },
  retail: {
    key: "retail",
    label: "Tạp hóa / Retail",
    primary: "oklch(58.5% 0.233 277.117)",
    accent: "oklch(76.8% 0.147 87.5)",
    headerBg: "bg-sky-50",
    terminology: { "sidebar.orders": "Bán hàng" },
  },
  electronics: {
    key: "electronics",
    label: "Điện máy",
    primary: "oklch(45% 0.24 277.023)",
    accent: "oklch(70.4% 0.191 22.216)",
    headerBg: "bg-slate-100",
    terminology: { "sidebar.products": "Sản phẩm điện máy" },
  },
  pharmacy: {
    key: "pharmacy",
    label: "Nhà thuốc",
    primary: "oklch(60.6% 0.25 292.717)",
    accent: "oklch(72.3% 0.219 149.579)",
    headerBg: "bg-teal-50",
    terminology: { "sidebar.products": "Thuốc & sản phẩm" },
  },
  beauty: {
    key: "beauty",
    label: "Spa / Làm đẹp",
    primary: "oklch(62.8% 0.257 3.148)",
    accent: "oklch(78.9% 0.154 310.8)",
    headerBg: "bg-pink-50",
    terminology: { "sidebar.products": "Dịch vụ & sản phẩm" },
  },
};

export const isNichePreset = (value: unknown): value is keyof typeof NICHE_PRESETS =>
  typeof value === "string" && value in NICHE_PRESETS;

/**
 * Per-preset sidebar defaults: small shops (e.g. fashion < 2 staff) don't
 * need staff/shift links, so they start hidden. Admins can override per
 * vendor via `appearance.sidebarHidden`.
 */
export const NICHE_DEFAULT_HIDDEN: Record<string, string[]> = {
  fashion: ["staff", "shift"],
  food: [],
  retail: [],
  electronics: [],
  pharmacy: [],
  beauty: ["shift"],
};

/** Toggleable sidebar entries shown in the Niche-theme settings tab. */
export const NICHE_SIDEBAR_TOGGLES = [
  { key: "staff", label: "Nhân viên (/staff)" },
  { key: "shift", label: "Chốt ca (/shift)" },
  { key: "financial", label: "Tài chính (/financial)" },
  { key: "provider", label: "Nhà cung cấp (/providers)" },
  { key: "import-order", label: "Nhập hàng (/import-order)" },
];

/** Effective hidden module keys = preset defaults ∪ explicit list − explicit shows.
 * `sidebarHidden` is the source of truth once saved; when empty/undefined the
 * preset defaults apply so fashion starts without staff links. */
export const resolveHiddenSidebar = (appearance?: IAppearanceSettings | null): string[] => {
  if (Array.isArray(appearance?.sidebarHidden)) return appearance!.sidebarHidden!;
  const presetKey = isNichePreset(appearance?.preset) ? appearance!.preset : "fashion";
  return [...(NICHE_DEFAULT_HIDDEN[presetKey] || [])];
};

export const isSidebarHidden = (moduleKey: string | undefined, appearance?: IAppearanceSettings | null): boolean => {
  if (!moduleKey) return false;
  return resolveHiddenSidebar(appearance).includes(moduleKey);
};

export interface IAppearanceSettings {
  preset?: string;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  terminology?: Record<string, string>;
  /** Module keys (e.g. "staff", "shift") hidden from sidebar/bottom-nav. Admin-only setting. */
  sidebarHidden?: string[];
}

/**
 * Resolve the effective variable map from appearance settings.
 * Manual colors win over the preset palette.
 */
export const resolveThemeVars = (appearance?: IAppearanceSettings | null): Record<string, string> => {
  const presetKey = isNichePreset(appearance?.preset) ? appearance!.preset : "fashion";
  const preset = NICHE_PRESETS[presetKey];
  const vars: Record<string, string> = {
    "--color-primary": preset.primary,
    "--color-accent": preset.accent,
  };
  if (appearance?.primaryColor) vars["--color-primary"] = appearance.primaryColor;
  if (appearance?.accentColor) vars["--color-accent"] = appearance.accentColor;
  return vars;
};

/** Terminology overrides merged from the preset + vendor custom map. */
export const resolveTerminology = (appearance?: IAppearanceSettings | null): Record<string, string> => {
  const presetKey = isNichePreset(appearance?.preset) ? appearance!.preset : "fashion";
  return { ...(NICHE_PRESETS[presetKey]?.terminology || {}), ...(appearance?.terminology || {}) };
};

/**
 * Apply the theme at runtime: writes CSS variables on :root and stores the
 * terminology override map for the i18n layer. Returns cleanup (unused on
 * :root but kept for symmetry with other appliers).
 */
export const applyNicheTheme = (appearance?: IAppearanceSettings | null) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = resolveThemeVars(appearance);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  // Persist the resolved terminology for the i18n store (read on next t() call)
  (window as any).__NICHE_TERMINOLOGY__ = resolveTerminology(appearance);
  (window as any).__NICHE_HIDDEN__ = resolveHiddenSidebar(appearance);
  window.dispatchEvent(new CustomEvent("niche-theme-change"));
};

/**
 * Hook helper for i18n: translate a key, applying niche terminology overrides
 * first (exact key match), then falling back to the normal dictionary.
 */
export const nicheTerm = (key: string): string | undefined => {
  if (typeof window === "undefined") return undefined;
  const map = (window as any).__NICHE_TERMINOLOGY__ as Record<string, string> | undefined;
  return map?.[key];
};
