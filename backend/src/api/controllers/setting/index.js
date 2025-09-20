const { SettingService } = require("@api/services");
const { retrieveFirstVendor } = require("@src/libs/utils");

module.exports = class SettingController {
  /**
   * Creates a setting with the provided payment information.
   *
   * @api {POST} /setting Create setting
   * @apiName createSetting
   * @apiGroup Setting
   * @apiParam {Object} payment Payment information to create.
   * @apiSuccess {Object} data Created setting data.
   * @apiError {Object} 400 Some error occurred.
   * @apiError {Object} 401 Unauthorized.
   */
  async createSetting(req, res, next) {
    try {
      const { payment } = req.body;

      const resp = await new SettingService().create({ payment });
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Updates a setting with the provided payment information.
   *
   * @api {PUT} /setting/:id Update setting
   * @apiName updateSetting
   * @apiGroup Setting
   * @apiParam {String} id Setting unique ID.
   * @apiParam {Object} payment Payment information to update.
   * @apiSuccess {Object} data Updated setting data.
   * @apiError {Object} 400 Some error occurred.
   * @apiError {Object} 401 Unauthorized.
   */

  async updateSetting(req, res, next) {
    try {
      const { id } = req.query;
      const { payment } = req.body;
      const resp = await new SettingService().updateSetting({ payment, id });
      return res.status(200).json({
        data: resp,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @api {GET} /setting Get setting
   * @apiName getSetting
   * @apiGroup Setting
   * @apiSuccess {Object} data setting data
   * @apiError {Object} 400 Some error occur
   * @apiError {Object} 401 Unauthorized
   */
  async getSetting(req, res, next) {
    try {
      const vendor = retrieveFirstVendor(req);
      const response = await new SettingService().getSetting(vendor.id);
      return res.status(200).json({ data: response });
    } catch (error) {
      next(error);
    }
  }
};
