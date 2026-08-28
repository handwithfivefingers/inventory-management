import { Link, useLocation } from "@remix-run/react";
import { m } from "motion/react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Icon } from "~/components/icon";
import { ISidebarChild, ISideBarItem, SIDE_BAR } from "~/constants/sidebar";
import { checkPermission } from "~/hooks/use-permission";
import { useTranslation } from "~/i18n";
import { cn } from "~/libs/utils";
import { usePermissionStore } from "~/store/permission.store";
import { BaseProps } from "~/types/common";
import { IRole } from "~/types/user";
interface ISidebarItem extends BaseProps {
  to?: string;
  label: string;
  iconName?: string;
  isActive?: boolean;
  divider?: boolean;
  /** Render as an indented child link (bullet dot on the left line) */
  isChildren?: boolean;
  items?: ISidebarChild[];
  /** 0 = top-level group, 1+ = group nested inside another group */
  level?: number;
}

/**
 * True when `pathname` is exactly `to` or lives under it
 * ("/products/123" matches "/products").
 */
const isRouteActive = (pathname: string, to?: string) => {
  if (!to || to === "#") return false;
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
};

/** Recursively check whether any descendant route is currently active */
const hasActiveDescendant = (items: ISidebarChild[] | undefined, pathname: string): boolean =>
  (items || []).some((item) =>
    item.items?.length ? hasActiveDescendant(item.items, pathname) : isRouteActive(pathname, item.to),
  );

/** Filter any level of entries down to what the user may see. */
const filterVisible = <T extends ISidebarChild | ISideBarItem>(items: T[], role?: IRole | undefined): T[] => {
  return items.filter((item) => !item.moduleKey || (role && checkPermission(role, item.moduleKey, "READ")));
};

export const Sidebar = () => {
  const { t } = useTranslation();
  const role = usePermissionStore();

  // Requirement 4: group headers remain visible even when the user lacks
  // permission for all children - only the children are filtered.
  const visibleGroups = useMemo(() => {
    return SIDE_BAR.map((group) =>
      group.items?.length ? { ...group, items: filterVisible(group.items, role) } : group,
    );
  }, [role]);

  return (
    <div className="flex flex-col h-full flex-1 p-2 rounded-md gap-1 overflow-auto scrollbar">
      {visibleGroups.map((group, index) => (
        <SideBarItem
          key={[group.labelKey, index].join("-")}
          to={group.to}
          label={t(group.labelKey)}
          iconName={group.iconName}
          divider={group.divider}
          items={group.items}
          level={0}
        />
      ))}
    </div>
  );
};

/**
 * One sidebar entry: a plain link (no children) or a collapsible group.
 * Groups nest recursively ("Products" lives inside "Warehouse"): every
 * level indents its children by pl-10 and draws its own vertical line,
 * so bullets always sit on the line like in the original design.
 */
const SideBarItem = ({ to, label, iconName, items, divider, level = 0 }: ISidebarItem) => {
  let location = useLocation();
  const pathname = location.pathname;

  // Top-level groups always render as collapsible headers even when
  // all children are filtered (requirement 4). Only leaf levels fall
  // back to a plain link when empty.
  if (!items?.length) {
    if (level === 0) {
      // Empty group: header stays visible with no children
      return (
        <CollapsibleGroup label={label} iconName={iconName} containsActive={false} level={level} divider={divider}>
          <GroupChildren items={[]} level={level} />
        </CollapsibleGroup>
      );
    }
    return (
      <LinkItem
        to={to || "#"}
        isActive={isRouteActive(pathname, to)}
        label={label}
        iconName={iconName}
        isChildren={level > 0}
        className={divider ? "border-t border-slate-200 dark:border-slate-700 pt-2 mt-1" : undefined}
      />
    );
  }

  // Collapsible group
  const containsActive = hasActiveDescendant(items, pathname);

  return (
    <CollapsibleGroup label={label} iconName={iconName} containsActive={containsActive} level={level} divider={divider}>
      <GroupChildren items={items} level={level} />
    </CollapsibleGroup>
  );
};

/**
 * Render the entries of a group. Among sibling leaves only the longest
 * matching prefix is highlighted, so visiting /products/attributes does
 * not also highlight the /products link.
 */
const GroupChildren = ({ items, level }: { items: ISidebarChild[]; level: number }) => {
  let location = useLocation();
  const { t } = useTranslation();
  const pathname = location.pathname;

  const activeLeafTo = useMemo(() => {
    const leaves = (items || [])
      .filter((item) => !item.items?.length && isRouteActive(pathname, item.to))
      .sort((a, b) => b.to.length - a.to.length);
    return leaves[0]?.to ?? null;
  }, [items, pathname]);

  return (
    <>
      {(items || []).map((item, i: number) => {
        if (item.items?.length) {
          return (
            <SideBarItem
              key={`${item.to}-${i}`}
              to={item.to}
              label={t(item.labelKey)}
              iconName={item.iconName}
              items={item.items}
              level={level + 1}
            />
          );
        }
        return (
          <LinkItem
            key={`${item.to}-${i}`}
            to={item.to}
            isActive={activeLeafTo === item.to}
            label={t(item.labelKey)}
            iconName={item.iconName}
            isChildren
          />
        );
      })}
    </>
  );
};

/** Height of one child row - keeps the guide line masked at both ends */
const ROW_HEIGHT = 36;

const CollapsibleGroup = ({
  label,
  iconName,
  containsActive,
  divider,
  level = 0,
  children,
}: Pick<ISidebarItem, "label" | "iconName" | "level" | "divider"> & {
  containsActive?: boolean;
  children: ReactNode;
}) => {
  // Expanded by default; auto-expand if the user navigates into a
  // group they manually collapsed.
  const [isExpand, setIsExpand] = useState<boolean>(true);

  useEffect(() => {
    if (containsActive) setIsExpand(true);
  }, [containsActive]);

  return (
    <div
      className={cn("flex flex-col", {
        ["border-t border-slate-200 dark:border-slate-700 pt-2 mt-1"]: divider,
      })}
    >
      {/* Group header */}
      <div
        className={cn(
          "py-1 transition-all rounded-md flex gap-2 justify-between cursor-pointer pr-3 text-indigo-950 hover:text-indigo-600 dark:hover:text-slate-800/80 dark:text-slate-200",
          {
            ["text-indigo-600 dark:text-slate-200"]: containsActive,
            // Nested headers align their icon with sibling link icons
            ["ml-6"]: level > 0,
          },
        )}
        onClick={() => setIsExpand(!isExpand)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsExpand(!isExpand);
        }}
      >
        <div className="flex gap-2 px-2 items-center">
          <Icon
            name={iconName || "chevron-down"}
            className={cn("min-w-7 px-[5px] dark:text-slate-200", containsActive ? "text-indigo-600" : undefined)}
          />
          <div className="flex-shrink-0 text-sm">{label}</div>
        </div>
        <m.div
          className={cn("w-5")}
          animate={{
            rotate: isExpand ? 180 : 0,
          }}
        >
          <Icon name="chevron-down" />
        </m.div>
      </div>

      {/* Children: grid-rows 0fr -> 1fr animates collapse without measuring */}
      <div
        className="grid transition-all duration-150 ease-in"
        style={{
          gridTemplateRows: isExpand ? "1fr" : "0fr",
          opacity: isExpand ? 1 : 0,
        }}
      >
        <div className="overflow-hidden min-h-0">
          {/* Every level indents by pl-10 and draws its own guide line */}
          <div className="relative flex flex-col gap-0.5 py-1 pl-10">
            <div
              className="absolute w-[1px] bg-indigo-600 dark:bg-slate-200 rounded-full left-7 mask-linear-[180deg,transparent_5%,black,transparent_95%]"
              style={{ height: `calc(100% - ${ROW_HEIGHT / 2}px)` }}
            />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const LinkItem = ({ to, isActive, className, label, iconName, isChildren }: Omit<ISidebarItem, "index">) => {
  return (
    <Link
      to={to || "#"}
      className={cn("py-1 hover:bg-white dark:hover:bg-slate-800/80 transition-all rounded-md relative", className, {
        ["bg-white dark:bg-slate-800/80 shadow-lg"]: isActive,
      })}
    >
      {isChildren && (
        <div
          className={cn(
            "w-1 h-1 ring-[2px] ring-indigo-600 dark:ring-slate-200 rounded-full absolute -left-[11px] top-1/2 -translate-x-1/2 -translate-y-1/2",
            {
              ["bg-indigo-600"]: isActive,
              ["bg-slate-200"]: !isActive,
            },
          )}
        />
      )}
      <div className="flex gap-2 relative py-1 px-4">
        {iconName && (
          <Icon
            name={iconName}
            className={cn("min-w-7 px-[5px] text-indigo-950 dark:text-slate-200", {
              ["text-indigo-600 dark:text-slate-200"]: isActive,
            })}
          />
        )}
        <div
          className={cn("text-indigo-950 dark:text-slate-200 text-sm", {
            ["text-indigo-600 dark:text-slate-200"]: isActive,
          })}
        >
          {label}
        </div>
        <div
          className={cn("absolute top-0 right-1 w-[3px] bg-indigo-600 dark:bg-indigo-50 z-10 h-full rounded-md", {
            ["hidden"]: !isActive,
          })}
        />
      </div>
    </Link>
  );
};
