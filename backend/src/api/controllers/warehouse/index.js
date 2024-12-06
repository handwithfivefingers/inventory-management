const { WarehouseService } = require("@api/services");
module.exports = class WarehouseController {
  async create(req, res, next) {
    try {
      const resp = await new WarehouseService().create(req.body);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
  async get(req, res, next) {
    try {
      const { count, rows } = await new WarehouseService().getWarehouse(req.query);
      return res.status(200).json({ total: count, data: rows });
    } catch (error) {
      next(error);
    }
  }
  async getWarehouseById(req, res, next) {
    try {
      const resp = await new WarehouseService().getWarehouseById({ params: req.params, query: req.query });
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
};
