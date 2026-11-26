const requiredInProduction = [
  "MONGODB_URI",
  "JWT_SECRET",
  "FRONTEND_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
  "GMAIL_CLIENT_ID",
  "GMAIL_CLIENT_SECRET",
  "GMAIL_REDIRECT_URI",
  "GMAIL_TOKEN_ENCRYPTION_KEY",
];

function validateEnvironment() {
  if (process.env.NODE_ENV !== "production") return;

  const missing = requiredInProduction.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

module.exports = { validateEnvironment };
