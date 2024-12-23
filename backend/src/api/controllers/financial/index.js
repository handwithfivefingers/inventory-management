const { FinancialService } = require("@src/api/services");
module.exports = class FinancialController {
  async get(req, res, next) {
    try {
      const { count, rows } = await new FinancialService().getFinancial(req);
      return res.status(200).json({ total: count, data: rows });
    } catch (error) {
      next(error);
    }
  }
  async getOrderById(req, res, next) {
    try {
      const resp = await new FinancialService().getOrderById({ params: req.params, query: req.query });
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
};
