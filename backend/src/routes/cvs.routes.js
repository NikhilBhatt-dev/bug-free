const express = require("express");
const controller = require("../controllers/cvs.controller");
const { authenticate, requireSameOrigin } = require("../middleware/auth");
const { uploadCv } = require("../middleware/upload");
const { asyncHandler } = require("../utils/asyncHandler");
const validator = require("../validators/cvs.validator");

const router = express.Router();
router.use(authenticate);
router.get("/", asyncHandler(controller.list));
router.post("/", requireSameOrigin, uploadCv, validator.uploadCv, asyncHandler(controller.upload));
router.get("/:cvId/access", validator.cvId, asyncHandler(controller.downloadUrl));
router.delete("/:cvId", requireSameOrigin, validator.cvId, asyncHandler(controller.remove));

module.exports = router;
