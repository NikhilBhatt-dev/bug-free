const express = require("express");
const controller = require("../controllers/applications.controller");
const { authenticate, requireSameOrigin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const validator = require("../validators/applications.validator");

const router = express.Router();
router.use(authenticate);
router.get("/export", validator.exportApplications, asyncHandler(controller.exportRecords));
router.get("/", validator.listApplications, asyncHandler(controller.list));
router.post("/", requireSameOrigin, validator.createApplication, asyncHandler(controller.create));
router.get("/:applicationId", validator.getApplication, asyncHandler(controller.getOne));
router.patch("/:applicationId", requireSameOrigin, validator.updateApplication, asyncHandler(controller.update));
router.delete("/:applicationId", requireSameOrigin, validator.removeApplication, asyncHandler(controller.remove));

module.exports = router;
