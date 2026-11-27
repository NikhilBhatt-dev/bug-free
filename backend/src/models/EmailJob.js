const mongoose = require("mongoose");

const emailJobItemSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },
    sentEmailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SentEmail",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "sending", "sent", "failed", "uncertain", "skipped"],
      default: "pending",
    },
    attempts: { type: Number, default: 0, min: 0, max: 3 },
    error: { type: String, trim: true, maxlength: 1000, default: null },
    companyName: { type: String, trim: true, maxlength: 160, default: null },
    jobRole: { type: String, trim: true, maxlength: 160, default: null },
    category: { type: String, trim: true, maxlength: 50, default: null },
    recipient: { type: String, trim: true, lowercase: true, maxlength: 254, default: null },
    subject: { type: String, trim: true, maxlength: 250, default: null },
    body: { type: String, trim: true, maxlength: 20000, default: null },
    cvReference: {
      cvId: { type: mongoose.Schema.Types.ObjectId, ref: "CV", default: null },
      cloudinaryPublicId: { type: String, trim: true, default: null },
      originalFileName: { type: String, trim: true, default: null },
    },
    confirmedAt: { type: Date, default: null },
    itemIdempotencyKey: { type: String, trim: true, maxlength: 128, default: null },
  },
  { _id: false },
);

const emailJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [emailJobItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length >= 1 && items.length <= 10,
        message: "An email job must contain between 1 and 10 items",
      },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "paused",
        "completed",
        "failed",
        "cancelled",
        "sent",
        "uncertain",
      ],
      default: "pending",
    },
    delayMs: { type: Number, required: true, min: 1000, max: 300000 },
    confirmedAt: { type: Date, required: true },
    nextRunAt: { type: Date, default: null },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    pauseReason: { type: String, trim: true, maxlength: 1000, default: null },
    pausedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

emailJobSchema.index({ userId: 1, status: 1, createdAt: 1 });
emailJobSchema.index({ status: 1, nextRunAt: 1 });
emailJobSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

module.exports = mongoose.model("EmailJob", emailJobSchema);
