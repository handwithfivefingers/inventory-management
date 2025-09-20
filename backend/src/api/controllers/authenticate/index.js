const { AuthenticateService } = require("../../services");
const { signToken } = require("@libs/token");
module.exports = class AuthenticateController {
  async login(req, res, next) {
    try {
      const resp = await new AuthenticateService().login(req);
      const token = await signToken({ id: resp.id, email: resp.email });
      res.cookie("session", token, {
        httpOnly: true,
        maxAge: 3600000 * 24,
      });
      res.cookie("__authorization", token, {
        httpOnly: true,
        maxAge: 3600000 * 24,
      });
      return res.status(200).json({
        data: resp,
        token,
      });
    } catch (error) {
      next(error);
    }
  }
  async get(req, res, next) {
    try {
      const resp = await new AuthenticateService().get(req);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
  async register(req, res, next) {
    try {
      const resp = await new AuthenticateService().register(req.body);
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
};
