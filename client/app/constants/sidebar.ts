import vi from "~/assets/lang/vi.json";
export const SIDE_BAR = [
  {
    to: "/",
    index:true,
    label: "Doanh thu",
    iconName: "home",
  },
  {
    to: "/orders",
    label: vi.Order,
    iconName: "package",
  },
  {
    to: "/products",
    label: vi.Product,
    iconName: "shopping-bag",
  },
  {
    to: "/providers",
    label: vi.Provider,
    iconName: "git-pull-request",
    // divider: "Kho hàng",
  },
  {
    to: "/warehouses",
    label: vi.WareHouse,
    iconName: "layers",
  },
  {
    to: "/import-order",
    label: vi.ImportOrder,
    iconName: "upload",
  },
  {
    divider: "Danh mục",
    to: "/categories",
    label: vi.Categories,
    iconName: "archive",
  },
  {
    to: "/units",
    label: vi.Unit,
    iconName: "dollar-sign",
  },
  {
    to: "/tags",
    label: vi.Tags,
    iconName: "tag",
  },
  {
    divider: "Thống kê",
    to: "/financial",
    label: vi.Financial,
    iconName: "bar-chart-2",
  },

  {
    to: "/staff",
    label: vi.Staff,
    iconName: "users",
    divider: "Quản lý",
  },
  {
    to: "/shilf",
    label: vi.Shift,
    iconName: "layers",
  },
  {
    to: "/setting",
    label: vi.Setting,
    iconName: "settings",
    divider: "Khác",
  },
];
