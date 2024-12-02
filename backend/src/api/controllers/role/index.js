const { RoleService } = require("@api/services");
module.exports = class RoleController {
  async create(req, res, next) {
    try {
      const resp = await new RoleService().create(req.body);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
  async get(req, res, next) {
    try {
      const resp = await new RoleService().getRoles();
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
};
