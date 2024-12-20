const { ImportOrderService } = require("@src/api/services");
module.exports = class OrderController {
  async create(req, res, next) {
    try {
      const resp = await new ImportOrderService().create(req.body);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
  async getOrders(req, res, next) {
    try {
      const { count, rows } = await new ImportOrderService().getOrders(req.query);
      return res.status(200).json({ total: count, data: rows });
    } catch (error) {
      next(error);
    }
  }
  async getOrderById(req, res, next) {
    try {
      const resp = await new ImportOrderService().getOrderById({ params: req.params, query: req.query });
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
};
