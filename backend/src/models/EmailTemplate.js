const mongoose = require("mongoose");
const { JOB_CATEGORIES } = require("../config/constants");

const emailTemplateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: { type: String, required: true, enum: JOB_CATEGORIES },
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 250,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 20000,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

emailTemplateSchema.index({ userId: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("EmailTemplate", emailTemplateSchema);
