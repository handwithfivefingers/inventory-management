const { ProviderService } = require("@api/services");
module.exports = class ProviderController {
  async create(req, res, next) {
    try {

      const resp = await new ProviderService().create(req);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
  async getProvider(req, res, next) {
    try {
      const { count, rows } = await new ProviderService().getProvider(req.query);
      return res.status(200).json({ total: count, data: rows });
    } catch (error) {
      next(error);
    }
  }
  async getId(req, res, next) {
    try {
      const resp = await new ProviderService().getProviderById(req);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
  async update(req, res, next) {
    try {
      const resp = await new ProviderService().update(req);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
};
