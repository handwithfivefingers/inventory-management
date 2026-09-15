import { Link, useLocation } from "@remix-run/react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "~/components/icon";
import { ISidebarChild, ISideBarItem, SIDE_BAR } from "~/constants/sidebar";
import { checkPermission } from "~/hooks/use-permission";
import { useTranslation } from "~/i18n";
import { cn } from "~/libs/utils";
import { usePermissionStore } from "~/store/permission.store";
import { IRole } from "~/types/user";

/** Direct leaf tabs - always first, before any group tab. Orders and
 *  Products are the primary mobile workflows and must stay visible. */
const LEAF_TABS: { to: string; labelKey: string; iconName: string; moduleKey: string }[] = [
  { to: "/orders", labelKey: "sidebar.orders", iconName: "package", moduleKey: "order" },
  { to: "/products", labelKey: "sidebar.products", iconName: "shopping-bag", moduleKey: "product" },
];

/** Group-tab candidates, in priority order. groupSale is intentionally last:
 *  its key flows (orders/products) already have their own tabs. */
const TAB_GROUP_LABEL_KEYS = [
  "sidebar.groupWarehouse",
  "sidebar.catalog",
  "sidebar.settings",
  "sidebar.groupSale",
  "sidebar.groupImport",
  "sidebar.groupReport",
  "sidebar.groupStaff",
];

/** Max primary tabs next to the "More" button. */
const MAX_TABS = 4;

interface ITabEntry {
  key: string;
  to?: string;
  labelKey: string;
  iconName?: string;
  items?: ISidebarChild[];
}

/**
 * True when `pathname` is exactly `to` or lives under it
 * ("/products/123" matches "/products"). Mirrors the sidebar logic.
 */
const isRouteActive = (pathname: string, to?: string) => {
  if (!to || to === "#") return false;
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
};

const hasActiveDescendant = (items: ISidebarChild[] | undefined, pathname: string): boolean =>
  (items || []).some((item) =>
    item.items?.length ? hasActiveDescendant(item.items, pathname) : isRouteActive(pathname, item.to),
  );

/** Recursively drop hidden/unauthorized leaves inside groups. */
const filterVisibleDeep = (items: ISidebarChild[] | undefined, role?: IRole | undefined): ISidebarChild[] => {
  const hidden: string[] =
    typeof window !== "undefined" ? ((window as any).__NICHE_HIDDEN__ as string[] | undefined) || [] : [];
  return (items || [])
    .filter(
      (item) =>
        (!item.moduleKey || (role && checkPermission(role, item.moduleKey, "READ"))) &&
        !hidden.includes(item.moduleKey || ""),
    )
    .map((item) => (item.items?.length ? { ...item, items: filterVisibleDeep(item.items, role) } : item));
};

/** First navigable leaf of a group - the tab's destination, like a native app. */
const firstLeafTo = (items: ISidebarChild[] | undefined): string | undefined => {
  for (const item of items || []) {
    if (item.items?.length) {
      const nested = firstLeafTo(item.items);
      if (nested) return nested;
    } else if (item.to && item.to !== "#") {
      return item.to;
    }
  }
  return undefined;
};

/**
 * Mobile bottom navigation (like a native app): up to 4 primary group tabs
 * plus a "More" button opening a bottom sheet with the remaining groups.
 * Rendered by AppLayout; hidden from the `sm` breakpoint up.
 */
export const BottomNav = () => {
  const { t } = useTranslation();
  const role = usePermissionStore();
  const location = useLocation();
  const pathname = location.pathname;
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [hiddenTick, setHiddenTick] = useState(0);
  useEffect(() => {
    const onChange = () => setHiddenTick((v) => v + 1);
    window.addEventListener("niche-theme-change", onChange);
    return () => window.removeEventListener("niche-theme-change", onChange);
  }, []);

  // Close the sheet whenever navigation happens.
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  const { tabs, moreGroups } = useMemo(() => {
    const hidden: string[] =
      typeof window !== "undefined" ? ((window as any).__NICHE_HIDDEN__ as string[] | undefined) || [] : [];
    const canSee = (moduleKey?: string) =>
      (!moduleKey || (role && checkPermission(role, moduleKey, "READ"))) && !hidden.includes(moduleKey || "");

    // 1. Primary leaf tabs (Orders, Products), permission- and niche-aware.
    const leafTabs: ITabEntry[] = LEAF_TABS.filter((leaf) => canSee(leaf.moduleKey)).map((leaf) => ({
      key: leaf.to,
      to: leaf.to,
      labelKey: leaf.labelKey,
      iconName: leaf.iconName,
    }));

    // 2. Fill the remaining slots with group tabs that still have a destination.
    const groups = SIDE_BAR.map((group) =>
      group.items?.length ? { ...group, items: filterVisibleDeep(group.items, role) } : group,
    );
    const tabKeys = TAB_GROUP_LABEL_KEYS;
    const groupTabs: ITabEntry[] = groups
      .filter((group) => tabKeys.includes(group.labelKey) && firstLeafTo(group.items))
      .sort((a, b) => tabKeys.indexOf(a.labelKey) - tabKeys.indexOf(b.labelKey))
      .slice(0, Math.max(0, MAX_TABS - leafTabs.length))
      .map((group) => ({
        key: group.labelKey,
        to: firstLeafTo(group.items),
        labelKey: group.labelKey,
        iconName: group.iconName,
        items: group.items,
      }));

    const tabGroupKeys = new Set(groupTabs.map((tab) => tab.key));
    // Everything else (with at least one visible leaf) goes to "More".
    const moreGroups = groups.filter(
      (group) => !tabGroupKeys.has(group.labelKey) && firstLeafTo(group.items),
    );
    return { tabs: [...leafTabs, ...groupTabs], moreGroups };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, hiddenTick]);

  const moreActive = moreGroups.some((group) => hasActiveDescendant(group.items, pathname));

  return (
    <>
      <nav
        aria-label={t("sidebar.other", { defaultValue: "Other" })}
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-700 dark:bg-slate-800/95 dark:supports-[backdrop-filter]:bg-slate-800/80"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-14">
          {tabs.map((tab) => (
            <BottomNavTab
              key={tab.key}
              to={tab.to}
              label={t(tab.labelKey)}
              iconName={tab.iconName}
              isActive={tab.items ? hasActiveDescendant(tab.items, pathname) : isRouteActive(pathname, tab.to)}
            />
          ))}
          <BottomNavTab
            label={t("common.more", { defaultValue: "More" })}
            iconName="menu"
            isActive={moreActive || isMoreOpen}
            onClick={() => setIsMoreOpen(true)}
          />
        </div>
      </nav>

      {/* "More" bottom sheet */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <m.div
              key="bottom-nav-backdrop"
              className="sm:hidden fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsMoreOpen(false)}
            />
            <m.div
              key="bottom-nav-sheet"
              className="sm:hidden fixed bottom-0 inset-x-0 z-50 max-h-[70svh] flex flex-col rounded-t-2xl bg-white dark:bg-slate-800 shadow-2xl dark:shadow-black/40"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex justify-center pt-2 pb-1 shrink-0">
                <div className="h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-600" />
              </div>
              <div className="overflow-y-auto px-2 pb-2">
                {moreGroups.map((group) => (
                  <MoreGroup
                    key={group.labelKey}
                    label={t(group.labelKey)}
                    iconName={group.iconName}
                    items={group.items}
                  />
                ))}
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

interface IBottomNavTab {
  to?: string;
  label: string;
  iconName?: string;
  isActive?: boolean;
  onClick?: () => void;
}

const BottomNavTab = ({ to, label, iconName, isActive, onClick }: IBottomNavTab) => {
  const className = cn(
    "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 text-[10px] leading-tight transition-colors cursor-pointer",
    isActive ? "text-primary font-medium" : "text-slate-500 dark:text-slate-400",
  );
  const content = (
    <>
      <Icon name={iconName || "circle"} fontSize={20} className={isActive ? "text-primary" : undefined} />
      <span className="w-full truncate text-center px-0.5">{label}</span>
    </>
  );
  if (to) {
    return (
      <Link to={to} className={className} aria-current={isActive ? "page" : undefined}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className} aria-expanded={isActive}>
      {content}
    </button>
  );
};

/** One group inside the "More" sheet: header plus its child links (recursive). */
const MoreGroup = ({
  label,
  iconName,
  items,
}: {
  label: string;
  iconName?: string;
  items?: ISidebarChild[];
}) => {
  const { t } = useTranslation();
  const location = useLocation();

  // Empty groups are dropped by the parent memo; never render a hollow header.
  if (!(items || []).length) return null;

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        <Icon name={iconName || "circle"} fontSize={14} />
        {label}
      </div>
      {(items || []).map((item, i) => (
        <MoreLink key={`${item.to}-${item.labelKey}-${i}`} item={item} depth={0} pathname={location.pathname} />
      ))}
    </div>
  );
};

const MoreLink = ({ item, depth, pathname }: { item: ISidebarChild; depth: number; pathname: string }) => {
  const { t } = useTranslation();
  if (item.items?.length) {
    return (
      <div className={depth > 0 ? "ml-4" : undefined}>
        <div className="px-3 py-1 text-xs font-medium text-slate-400 dark:text-slate-500">{t(item.labelKey)}</div>
        {item.items.map((child, j) => (
          <MoreLink key={`${child.to}-${j}`} item={child} depth={depth + 1} pathname={pathname} />
        ))}
      </div>
    );
  }
  return (
    <Link
      to={item.to}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 ml-4 text-sm transition-colors",
        isRouteActive(pathname, item.to)
          ? "bg-indigo-50 text-primary dark:bg-slate-700 dark:text-slate-100"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60",
      )}
    >
      {item.iconName && <Icon name={item.iconName} fontSize={16} />}
      <span className="truncate">{t(item.labelKey)}</span>
    </Link>
  );
};
