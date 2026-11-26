const express = require("express");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "JobPilot API is healthy",
    data: { status: "ok", timestamp: new Date().toISOString() },
    error: null,
  });
});

module.exports = router;
