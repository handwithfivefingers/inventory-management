export interface ISidebarChild {
  to: string;
  labelKey: string;
  iconName?: string;
  divider?: boolean;
  /** Exact-match link (e.g. the dashboard "/") */
  index?: boolean;
  /** Optional nested level (e.g. Products inside the Warehouse group) */
  items?: ISidebarChild[];
}

export interface ISideBarItem {
  to?: string;
  index?: boolean;
  labelKey: string;
  iconName?: string;
  divider?: boolean;
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
        to: "/",
        index: true,
        labelKey: "sidebar.revenue",
        iconName: "home",
      },
      {
        to: "/orders",
        labelKey: "sidebar.orders",
        iconName: "package",
      },
      {
        to: "/products",
        labelKey: "sidebar.products",
        iconName: "shopping-bag",
      },
      {
        to: "/customers",
        labelKey: "sidebar.customers",
        iconName: "users",
      },
      {
        to: "/invoices",
        labelKey: "sidebar.invoices",
        iconName: "file-text",
      },
      {
        to: "/products/attributes",
        labelKey: "sidebar.attributes",
        iconName: "sliders",
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
        iconName: "git-pull-request",
      },
      {
        to: "/import-order",
        labelKey: "sidebar.importOrder",
        iconName: "upload",
      },
    ],
  },
  {
    labelKey: "sidebar.groupWarehouse",
    iconName: "layers",
    items: [
      {
        to: "/warehouses",
        labelKey: "sidebar.warehouses",
        iconName: "layers",
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
      },
      {
        to: "/units",
        labelKey: "sidebar.units",
        iconName: "dollar-sign",
      },
      {
        to: "/tags",
        labelKey: "sidebar.tags",
        iconName: "tag",
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
      },
      {
        to: "/shift",
        labelKey: "sidebar.shift",
        iconName: "layers",
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
      },
      {
        to: "/setting/payment",
        labelKey: "sidebar.payment",
        iconName: "credit-card",
      },
      {
        to: "/setting/role",
        labelKey: "sidebar.role",
        iconName: "shield",
      },
    ],
  },
];
