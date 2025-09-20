const { TagsService } = require("@src/api/services");
module.exports = class TagsController {
  async create(req, res, next) {
    try {
      const resp = await new TagsService().create(req.body);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
  async update(req, res, next) {
    try {
      const resp = await new TagsService().update(req);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
  async get(req, res, next) {
    try {
      const { count, rows } = await new TagsService().getTags(req.query);
      return res.status(200).json({ total: count, data: rows });
    } catch (error) {
      next(error);
    }
  }
  async getById(req, res, next) {
    try {
      const resp = await new TagsService().getById({ params: req.params, query: req.query });
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      console.warn("error", error);
      next(error);
    }
  }
};
