const { param, query } = require("express-validator");
const { JOB_CATEGORIES } = require("../config/constants");
const { validate } = require("./validate");

module.exports = {
  sentEmailId: [param("sentEmailId").isMongoId(), validate],
  list: [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("category").optional().isIn(JOB_CATEGORIES),
    query("applicationId").optional().isMongoId(),
    query("search").optional().trim().isLength({ max: 160 }),
    query("sortBy").optional().isIn(["sentAt", "recipient", "companyName"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),
    validate,
  ],
};
