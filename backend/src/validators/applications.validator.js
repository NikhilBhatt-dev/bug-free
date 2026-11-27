const { body, param, query } = require("express-validator");
const { APPLICATION_STATUSES, JOB_CATEGORIES } = require("../config/constants");
const { validate } = require("./validate");

const objectId = () => param("applicationId").isMongoId().withMessage("Invalid application id");
const applicationFields = [
  body("companyName").trim().notEmpty().isLength({ max: 160 }),
  body("jobRole").trim().notEmpty().isLength({ max: 160 }),
  body("hrEmail")
    .trim()
    .isEmail()
    .withMessage("Provide a valid HR email address")
    .normalizeEmail(),
  body("hrName").optional({ nullable: true }).trim().isLength({ max: 120 }),
  body("category").isIn(JOB_CATEGORIES),
  body("applicationDate").optional().isISO8601().toDate(),
  body("status").optional().isIn(APPLICATION_STATUSES),
  body("sourceUrl")
    .customSanitizer((value) => {
      if (value === null) return undefined;
      if (typeof value === "string") return value.trim() || undefined;
      return value;
    })
    .custom((value) => {
      if (value === undefined) return true;
      if (typeof value !== "string" || value.length > 2048) return false;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    })
    .withMessage("Source URL must be a valid HTTP or HTTPS URL"),
  body("notes").optional().trim().isLength({ max: 5000 }),
];
const partialApplicationFields = applicationFields.map((validation) => validation.optional());
const listQuery = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("status").optional().isIn(APPLICATION_STATUSES),
  query("category").optional().isIn(JOB_CATEGORIES),
  query("search").optional().trim().isLength({ max: 160 }),
  query("sortBy").optional().isString(),
  query("sortOrder").optional().isIn(["asc", "desc"]),
];

module.exports = {
  createApplication: [...applicationFields, validate],
  exportApplications: [...listQuery, query("format").isIn(["csv", "xlsx"]), validate],
  getApplication: [objectId(), validate],
  listApplications: [...listQuery, validate],
  removeApplication: [objectId(), validate],
  updateApplication: [objectId(), ...partialApplicationFields, validate],
};
