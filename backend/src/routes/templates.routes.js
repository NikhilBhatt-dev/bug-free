const express = require("express");
const controller = require("../controllers/templates.controller");
const { authenticate, requireSameOrigin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const validator = require("../validators/templates.validator");

const router = express.Router();
router.use(authenticate);
router.get("/", asyncHandler(controller.list));
router.get("/:templateId", validator.get, asyncHandler(controller.getOne));
router.put("/", requireSameOrigin, validator.createOrReplace, asyncHandler(controller.createOrReplace));
router.patch("/:templateId", requireSameOrigin, validator.update, asyncHandler(controller.update));
router.delete("/:templateId", requireSameOrigin, validator.remove, asyncHandler(controller.remove));

module.exports = router;
