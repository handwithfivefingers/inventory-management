const { AuthenticateService } = require("../../services");

module.exports = class AuthenticateController {
  async login() {}
  async register(req, res, next) {
    try {
      const resp = await new AuthenticateService().register(req.body);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
    //   res.status = 400;
    //   res.message = error.toString();
      next(error);
    }
  }
};
