const Sentry = require("@sentry/node");
module.exports = {
  handleErrors: (req, res, err) => {
    Sentry.captureException(err);
    return res.status(400).json({});
  },
};
