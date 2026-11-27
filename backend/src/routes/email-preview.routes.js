const express = require("express");
const controller = require("../controllers/email.controller");
const { authenticate, requireSameOrigin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const validator = require("../validators/email.validator");

const router = express.Router();
router.use(authenticate);
router.post("/preview", requireSameOrigin, validator.preview, asyncHandler(controller.preview));
router.post("/confirm", requireSameOrigin, validator.confirm, asyncHandler(controller.confirm));

module.exports = router;
