const mongoose = require("mongoose");

const sentEmailSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    emailJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailJob",
      default: null,
    },
    recipient: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Provide a valid recipient email"],
    },
    subject: { type: String, required: true, trim: true, maxlength: 250 },
    body: { type: String, required: true, maxlength: 20000 },
    cvReference: {
      cvId: { type: mongoose.Schema.Types.ObjectId, ref: "CV", required: true },
      cloudinaryPublicId: { type: String, required: true, trim: true },
      originalFileName: { type: String, required: true, trim: true },
    },
    status: {
      type: String,
      enum: ["queued", "sending", "sent", "failed", "uncertain"],
      required: true,
      default: "queued",
    },
    sentAt: { type: Date, default: null },
    gmailMessageId: { type: String, trim: true, sparse: true, default: null },
    gmailThreadId: { type: String, trim: true, default: null },
    failureReason: { type: String, trim: true, maxlength: 1000, default: null },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },
    sentDateKey: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

sentEmailSchema.index({ userId: 1, createdAt: -1 });
sentEmailSchema.index({ userId: 1, applicationId: 1, createdAt: -1 });
sentEmailSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
sentEmailSchema.index(
  { userId: 1, gmailMessageId: 1 },
  { unique: true, sparse: true },
);

module.exports = mongoose.model("SentEmail", sentEmailSchema);
