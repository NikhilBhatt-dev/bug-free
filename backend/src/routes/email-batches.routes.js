const express = require("express");
const controller = require("../controllers/email.controller");
const { authenticate, requireSameOrigin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const validator = require("../validators/email.validator");

const router = express.Router();
router.use(authenticate);
router.get("/", validator.listBatches, asyncHandler(controller.listBatches));
router.post("/", requireSameOrigin, validator.createBatch, asyncHandler(controller.createBatch));
router.get("/:batchId", validator.batchId, asyncHandler(controller.getBatch));
router.post("/:batchId/cancel", requireSameOrigin, validator.batchId, asyncHandler(controller.cancelBatch));
router.get("/:batchId/jobs/:jobKey", validator.job, asyncHandler(controller.getJob));

module.exports = router;
