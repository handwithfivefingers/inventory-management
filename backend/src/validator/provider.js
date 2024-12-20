const { query, validationResult } = require("express-validator");

const providerValidation = [
  query("vendor").notEmpty(),
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) {
      return next();
    }
    // Sentry.captureException(errors);
    return res.status(400).send({ errors: result.array() });
  },
];

module.exports = providerValidation;
