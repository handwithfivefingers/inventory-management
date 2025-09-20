const { query, validationResult, body } = require("express-validator");

const providerValidation = [
  query("vendor").notEmpty(),
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) {
      return next();
    }
    return res.status(400).send({ errors: result.array() });
  },
];

const providerCreateValidation = [
  body("name").notEmpty(),
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) {
      return next();
    }
    return res.status(400).send({ errors: result.array() });
  },
];

module.exports = { providerValidation, providerCreateValidation };
