const { PermissionService } = require("@api/services");

module.exports = class PermissionController {
  async create(req, res, next) {
    try {
      const resp = await new PermissionService().create(req.body);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
  async get(req, res, next) {
    try {
      const resp = await new PermissionService().getPermission();
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
};
