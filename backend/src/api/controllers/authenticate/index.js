const { AuthenticateService } = require("../../services");
const { signToken } = require("@libs/token");
module.exports = class AuthenticateController {
  async login(req, res, next) {
    try {
      const resp = await new AuthenticateService().login(req.body);
      const token = await signToken({ id: resp.id, email: resp.email });
      res.cookie("session", token, {
        httpOnly: true,
        maxAge: 3600 * 24,
      });
      console.log("cookie created successfully");
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
      const resp = await new AuthenticateService().get(req.locals.user.id);
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
