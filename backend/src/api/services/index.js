const RoleService = require("./role");
const PermissionService = require("./permission");
const VendorService = require("./vendor");
const WarehouseService = require("./warehouse");
const OrderService = require("./orders");
const OrderDetailService = require("./orderDetails");
const TransferService = require("./transfer");
const CategoriesService = require("./categories");
const UnitsService = require("./units");
const TagsService = require("./tags");
const ImportOrderService = require("./importOrder");
const ProviderService = require("./provider");
const FinancialService = require("./financial");
module.exports = {
  AuthenticateService: require("./authenticate"),
  ProductService: require("./product"),
  PermissionService,
  RoleService,
  VendorService,
  WarehouseService,
  OrderService,
  OrderDetailService,
  TransferService,
  CategoriesService,
  UnitsService,
  TagsService,
  ImportOrderService,
  ProviderService,
  FinancialService
};
