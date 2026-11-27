const express = require("express");
const controller = require("../controllers/email.controller");
const { authenticate, requireSameOrigin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const validator = require("../validators/email.validator");

const router = express.Router();
router.use(authenticate);
router.get("/sending", asyncHandler(controller.getSettings));
router.put("/sending", requireSameOrigin, validator.settings, asyncHandler(controller.updateSettings));

module.exports = router;
