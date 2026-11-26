const express = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate, requireSameOrigin } = require("../middleware/auth");

const router = express.Router();

router.get("/google", authController.startGoogleLogin);
router.get("/google/callback", authController.handleGoogleCallback);
router.get("/me", authenticate, authController.getCurrentUser);
router.post("/logout", requireSameOrigin, authenticate, authController.logout);

module.exports = router;
