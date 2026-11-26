const requiredInProduction = ["MONGODB_URI", "JWT_SECRET", "FRONTEND_URL"];

function validateEnvironment() {
  if (process.env.NODE_ENV !== "production") return;

  const missing = requiredInProduction.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

module.exports = { validateEnvironment };
