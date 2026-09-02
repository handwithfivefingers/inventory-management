export interface ISidebarChild {
  to: string;
  labelKey: string;
  iconName?: string;
  divider?: boolean;
  /** Exact-match link (e.g. the dashboard "/") */
  index?: boolean;
  /** Permission module key - the item only renders for users holding the
   *  module's R permission (mirrors backend-ts/src/constant/modules.ts). */
  moduleKey?: string;
  /** Optional nested level (e.g. Products inside the Warehouse group) */
  items?: ISidebarChild[];
}

export interface ISideBarItem {
  to?: string;
  index?: boolean;
  labelKey: string;
  iconName?: string;
  divider?: boolean;
  /** Permission module key gating this group (defaults: visible if any child is visible) */
  moduleKey?: string;
  items?: ISidebarChild[];
}

/**
 * Navigation grouped into collapsible sections:
 * Sale, Import, Warehouse, Catalog, Report, Staff and Setting.
 * Each group can collapse/expand and contains the navigation links.
 */
export const SIDE_BAR: ISideBarItem[] = [
  {
    labelKey: "sidebar.groupSale",
    iconName: "shopping-cart",
    items: [
      {
        to: "/dashboard",
        labelKey: "sidebar.revenue",
        iconName: "bar-chart-2",
        moduleKey: "dashboard",
      },
      {
        to: "/orders",
        labelKey: "sidebar.orders",
        iconName: "package",
        moduleKey: "order",
      },
      {
        to: "/products",
        labelKey: "sidebar.products",
        iconName: "shopping-bag",
        moduleKey: "product",
      },
      {
        to: "/customers",
        labelKey: "sidebar.customers",
        iconName: "users",
        moduleKey: "customer",
      },
      {
        to: "/invoices",
        labelKey: "sidebar.invoices",
        iconName: "file-text",
        moduleKey: "invoice",
      },
      {
        to: "/products/attributes",
        labelKey: "sidebar.attributes",
        iconName: "sliders",
        moduleKey: "product",
      },
    ],
  },
  {
    labelKey: "sidebar.groupImport",
    iconName: "upload",
    items: [
      {
        to: "/providers",
        labelKey: "sidebar.providers",
        iconName: "truck",
        moduleKey: "provider",
      },
      {
        to: "/import-order",
        labelKey: "sidebar.importOrder",
        iconName: "upload",
        moduleKey: "import-order",
      },
    ],
  },
  {
    labelKey: "sidebar.groupWarehouse",
    iconName: "home",
    items: [
      {
        to: "/warehouses",
        labelKey: "sidebar.warehouses",
        iconName: "home",
        moduleKey: "warehouse",
      },
    ],
  },
  {
    labelKey: "sidebar.catalog",
    iconName: "archive",
    items: [
      {
        to: "/categories",
        labelKey: "sidebar.categories",
        iconName: "archive",
        moduleKey: "category",
      },
      {
        to: "/units",
        labelKey: "sidebar.units",
        iconName: "dollar-sign",
        moduleKey: "unit",
      },
      {
        to: "/tags",
        labelKey: "sidebar.tags",
        iconName: "tag",
        moduleKey: "tag",
      },
    ],
  },
  {
    labelKey: "sidebar.groupReport",
    iconName: "bar-chart-2",
    items: [
      {
        to: "/financial",
        labelKey: "sidebar.financial",
        iconName: "bar-chart-2",
        moduleKey: "financial",
      },
    ],
  },
  {
    labelKey: "sidebar.groupStaff",
    iconName: "users",
    divider: true,
    items: [
      {
        to: "/staff",
        labelKey: "sidebar.staff",
        iconName: "users",
        moduleKey: "staff",
      },
      {
        to: "/shift",
        labelKey: "sidebar.shift",
        iconName: "layers",
        moduleKey: "shift",
      },
    ],
  },
  {
    labelKey: "sidebar.settings",
    iconName: "settings",
    divider: true,
    items: [
      {
        to: "/setting/general",
        labelKey: "sidebar.generalSettings",
        iconName: "settings",
        moduleKey: "setting",
      },
      {
        to: "/setting/payment",
        labelKey: "sidebar.payment",
        iconName: "credit-card",
        moduleKey: "setting",
      },
      {
        to: "/setting/role",
        labelKey: "sidebar.role",
        iconName: "shield",
        moduleKey: "role",
      },
    ],
  },
];
