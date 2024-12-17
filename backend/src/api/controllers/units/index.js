const { UnitsService } = require("@src/api/services");
module.exports = class UnitsController {
  async create(req, res, next) {
    try {
      const resp = await new UnitsService().create(req.body);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
  async update(req, res, next) {
    try {
      const resp = await new UnitsService().update({ id: req.params.id }, req.body);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
  async get(req, res, next) {
    try {
      const { count, rows } = await new UnitsService().getUnits(req.query);
      return res.status(200).json({ total: count, data: rows });
    } catch (error) {
      next(error);
    }
  }
  async getById(req, res, next) {
    try {
      const resp = await new UnitsService().getById({ params: req.params, query: req.query });
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      console.warn("error", error);
      next(error);
    }
  }
};
