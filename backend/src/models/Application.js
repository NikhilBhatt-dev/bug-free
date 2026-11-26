const mongoose = require("mongoose");
const { APPLICATION_STATUSES, JOB_CATEGORIES } = require("../config/constants");

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 160,
    },
    jobRole: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 160,
    },
    hrEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Provide a valid HR email address"],
    },
    hrName: { type: String, trim: true, maxlength: 120, default: null },
    category: { type: String, required: true, enum: JOB_CATEGORIES },
    applicationDate: { type: Date, default: Date.now },
    status: { type: String, enum: APPLICATION_STATUSES, default: "saved" },
    sourceUrl: { type: String, trim: true, maxlength: 2048, default: null },
    notes: { type: String, trim: true, maxlength: 5000, default: "" },
  },
  { timestamps: true },
);

applicationSchema.index({ userId: 1, status: 1, applicationDate: -1 });
applicationSchema.index({ userId: 1, category: 1, applicationDate: -1 });
applicationSchema.index({ userId: 1, companyName: 1 });

module.exports = mongoose.model("Application", applicationSchema);
