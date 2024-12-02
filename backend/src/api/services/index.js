const RoleService = require("./role");
const PermissionService = require("./permission");
const VendorService = require("./vendor");
const WarehouseService = require("./warehouse");
module.exports = {
  AuthenticateService: require("./authenticate"),
  ProductService: require("./product"),
  PermissionService,
  RoleService,
  VendorService,
  WarehouseService,
};
