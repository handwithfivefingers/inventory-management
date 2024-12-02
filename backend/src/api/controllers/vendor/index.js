const { VendorService } = require("@api/services");
module.exports = class VendorController {
  async create(req, res, next) {
    try {
      const resp = await new VendorService().create(req.body);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
  async get(req, res, next) {
    try {
      const resp = await new VendorService().getVendors();
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
};
