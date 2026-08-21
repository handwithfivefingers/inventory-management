export interface ISidebarChild {
  to: string;
  labelKey: string;
  iconName?: string;
  divider?: boolean;
}

export interface ISideBarItem {
  to?: string;
  index?: boolean;
  labelKey: string;
  iconName?: string;
  divider?: boolean;
  items?: ISidebarChild[];
}

export const SIDE_BAR: ISideBarItem[] = [
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
    to: "/providers",
    labelKey: "sidebar.providers",
    iconName: "git-pull-request",
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
    to: "/warehouses",
    labelKey: "sidebar.warehouses",
    iconName: "layers",
  },
  {
    to: "/import-order",
    labelKey: "sidebar.importOrder",
    iconName: "upload",
  },
  {
    to: "#",
    labelKey: "sidebar.catalog",
    iconName: "archive",
    items: [
      {
        divider: true,
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
    to: "/financial",
    labelKey: "sidebar.statistics",
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
    labelKey: "sidebar.management",
    iconName: "triangle",
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
    to: "/setting",
    labelKey: "sidebar.settings",
    iconName: "settings",
    divider: true,
  },
];
