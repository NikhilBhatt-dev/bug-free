const express = require("express");
const controller = require("../controllers/gmail.controller");
const { authenticate, requireSameOrigin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(authenticate);
router.get("/connect", requireSameOrigin, asyncHandler(controller.startConnection));
router.get("/callback", asyncHandler(controller.handleCallback));
router.get("/status", asyncHandler(controller.getStatus));
router.post("/disconnect", requireSameOrigin, asyncHandler(controller.disconnect));

module.exports = router;
