const RoleService = require("./role");
const PermissionService = require("./permission");
const VendorService = require("./vendor");
const WarehouseService = require("./warehouse");
const OrderService = require("./orders");
const OrderDetailService = require("./orderDetails");
module.exports = {
  AuthenticateService: require("./authenticate"),
  ProductService: require("./product"),
  PermissionService,
  RoleService,
  VendorService,
  WarehouseService,
  OrderService,
  OrderDetailService,
};
