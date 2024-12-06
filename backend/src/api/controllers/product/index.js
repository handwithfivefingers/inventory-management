const { ProductService } = require("../../services");

module.exports = class ProductController {
  async create(req, res, next) {
    try {
      const resp = await new ProductService().create(req.body);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
  async getProduct(req, res, next) {
    try {
      const { count, rows } = await new ProductService().getProduct(req);
      return res.status(200).json({ total: count, data: rows });

    } catch (error) {
      next(error);
    }
  }
  async getProductById(req, res, next) {
    try {
      const resp = await new ProductService().getProductById({ params: req.params, query: req.query });
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
};
