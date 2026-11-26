const { body, param } = require("express-validator");
const { JOB_CATEGORIES } = require("../config/constants");
const { validate } = require("./validate");

const templateFields = [
  body("category").isIn(JOB_CATEGORIES),
  body("subject").trim().notEmpty().isLength({ max: 250 }),
  body("body").trim().notEmpty().isLength({ max: 20000 }),
  body("isActive").optional().isBoolean().toBoolean(),
];

module.exports = {
  createOrReplace: [...templateFields, validate],
  get: [param("templateId").isMongoId(), validate],
  remove: [param("templateId").isMongoId(), validate],
  update: [
    param("templateId").isMongoId(),
    body("subject").optional().trim().notEmpty().isLength({ max: 250 }),
    body("body").optional().trim().notEmpty().isLength({ max: 20000 }),
    body("isActive").optional().isBoolean().toBoolean(),
    validate,
  ],
};
