const { validationResult } = require("express-validator");
const { ApiError } = require("../utils/apiError");

function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return next(
    new ApiError(400, "Validation failed", "VALIDATION_ERROR", errors.array()),
  );
}

module.exports = { validate };
