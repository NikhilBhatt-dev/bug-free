const mongoose = require("mongoose");
const { JOB_CATEGORIES } = require("../config/constants");

const userSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    dailySendingLimit: { type: Number, default: 20, min: 1, max: 20 },
    emailDelayMs: { type: Number, default: 30000, min: 1000, max: 300000 },
    timezone: { type: String, default: "UTC", trim: true, maxlength: 100 },
    defaultApplicationCategory: {
      type: String,
      enum: JOB_CATEGORIES,
      default: "other",
      trim: true,
    },
    gmailConnection: {
      connected: { type: Boolean, default: false },
      connectedAt: { type: Date, default: null },
      email: { type: String, default: null, lowercase: true, trim: true },
      encryptedRefreshToken: { type: String, default: null, select: false },
      grantedScopes: { type: [String], default: [] },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UserSettings", userSettingsSchema);
