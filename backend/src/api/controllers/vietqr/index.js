const VIETQRService = require("@src/api/services/vietqr");

module.exports = class VIETQRController {
  generate = async (req, res, next) => {
    try {
      const resp = await new VIETQRService().generateQR();
      // return res.status(200).json(resp)
      return res.status(200).send(`<img src="${resp}" />`);
    } catch (error) {
      next(error);
    }
  };
};
