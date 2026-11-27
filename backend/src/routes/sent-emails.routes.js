const express = require("express");
const controller = require("../controllers/sent-email.controller");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const validator = require("../validators/sent-email.validator");

const router = express.Router();
router.use(authenticate);
router.get("/", validator.list, asyncHandler(controller.list));
router.get("/:sentEmailId", validator.sentEmailId, asyncHandler(controller.getOne));

module.exports = router;
