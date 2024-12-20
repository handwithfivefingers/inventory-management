const { body, validationResult } = require("express-validator");

const productValidation = [
  body("warehouseId").notEmpty(),
  body("quantity").notEmpty(),
  (req, res, next) => {
    console.log("req.body", req.body);
    const result = validationResult(req);
    if (result.isEmpty()) {
      return next();
    }
    return res.status(400).send({ errors: result.array() });
  },
];

module.exports = productValidation;
