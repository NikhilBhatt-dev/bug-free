const mongoose = require("mongoose");
const { JOB_CATEGORIES } = require("../config/constants");

const cvSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: { type: String, required: true, enum: JOB_CATEGORIES },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    mimeType: { type: String, required: true, enum: ["application/pdf"] },
    fileSizeBytes: {
      type: Number,
      required: true,
      min: 1,
      max: 5 * 1024 * 1024,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    secureUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    version: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

cvSchema.index({ userId: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("CV", cvSchema);
