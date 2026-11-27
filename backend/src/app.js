const cors = require("cors");
const cookieParser = require("cookie-parser");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { passport } = require("./config/passport");
const authRoutes = require("./routes/auth.routes");
const healthRoutes = require("./routes/health.routes");
const applicationRoutes = require("./routes/applications.routes");
const cvRoutes = require("./routes/cvs.routes");
const templateRoutes = require("./routes/templates.routes");
const gmailRoutes = require("./routes/gmail.routes");
const emailPreviewRoutes = require("./routes/email-preview.routes");
const emailBatchRoutes = require("./routes/email-batches.routes");
const userSettingsRoutes = require("./routes/user-settings.routes");
const sentEmailRoutes = require("./routes/sent-emails.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const app = express();
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("CORS origin is not allowed"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please try again later.",
      data: null,
      error: { code: "RATE_LIMITED" },
    },
  }),
);

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/cvs", cvRoutes);
app.use("/api/email-templates", templateRoutes);
app.use("/api/gmail", gmailRoutes);
app.use("/api/email-preview", emailPreviewRoutes);
app.use("/api/email-batches", emailBatchRoutes);
app.use("/api/user-settings", userSettingsRoutes);
app.use("/api/sent-emails", sentEmailRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
