const { body, param, query } = require("express-validator");
const { validate } = require("./validate");

const objectId = (name) => param(name).isMongoId();

module.exports = {
  preview: [
    body("applicationId").isMongoId(),
    body("templateId").optional().isMongoId(),
    body("recipient").optional().trim().isEmail(),
    body("hrName").optional({ nullable: true }).trim().isLength({ max: 120 }),
    validate,
  ],
  confirm: [
    body("snapshot").isObject(),
    body("confirmationToken").isString().notEmpty(),
    validate,
  ],
  createBatch: [
    body("idempotencyKey").isString().trim().notEmpty().isLength({ max: 128 }),
    body("items").isArray({ min: 1, max: 10 }),
    body("items.*.snapshot").isObject(),
    body("items.*.confirmationToken").isString().notEmpty(),
    validate,
  ],
  batchId: [objectId("batchId"), validate],
  job: [objectId("batchId"), param("jobKey").isString().trim().notEmpty(), validate],
  listBatches: [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("status").optional().isIn(["pending", "processing", "paused", "completed", "failed", "cancelled", "sent", "uncertain"]),
    validate,
  ],
  settings: [
    body("emailDelayMs").optional().isInt({ min: 1000, max: 300000 }).toInt(),
    body("dailySendingLimit").optional().isInt({ min: 1, max: 20 }).toInt(),
    body("timezone").optional().trim().isLength({ min: 1, max: 100 }),
    body("resumeSending").optional().isBoolean().toBoolean(),
    validate,
  ],
};
