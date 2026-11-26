const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      immutable: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Provide a valid email address"],
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    avatarUrl: { type: String, trim: true, maxlength: 2048, default: null },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    authProvider: {
      type: String,
      enum: ["google"],
      default: "google",
      immutable: true,
    },
    emailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ createdAt: -1 });

module.exports = mongoose.model("User", userSchema);
