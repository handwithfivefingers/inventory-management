const { body, validationResult, query } = require("express-validator");

const importOrderValidation = [
  query("vendor").notEmpty(),
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) {
      return next();
    }
    return res.status(400).send({ errors: result.array() });
  },
];

module.exports = importOrderValidation;
