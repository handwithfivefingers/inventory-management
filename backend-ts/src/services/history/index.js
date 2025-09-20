const { TransferService } = require("@src/api/services");
module.exports = class HistoryController {
  async getHistoryByProductId(req, res, next) {
    try {
      const { count, rows } = await new TransferService().getHistoryByProductId(req);
      return res.status(200).json({ total: count, data: rows });
    } catch (error) {
      next(error);
    }
  }
};
