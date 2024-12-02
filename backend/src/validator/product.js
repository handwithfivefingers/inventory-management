const { body, validationResult } = require("express-validator");

const productValidation = [
  body("warehouseId").notEmpty(),
  body("quantity").notEmpty(),
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) {
      return next()
    }
    res.send({ errors: result.array() });
  },
];

module.exports = productValidation;
