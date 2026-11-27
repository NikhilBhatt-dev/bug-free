const { getGmailConfigurationIssues } = require("./gmail");

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
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "COOKIE_SECURE",
  "COOKIE_SAME_SITE",
];

const placeholderPattern =
  /<[^>]+>|^(?:example|your|replace|placeholder|default|change[-_ ]?me)(?:[-_ ]|$)/i;

function isPlaceholder(value) {
  return placeholderPattern.test(value);
}

function isStrongJwtSecret(value) {
  return (
    value.length >= 32 &&
    new Set(value).size >= 16 &&
    !/\s/.test(value) &&
    !isPlaceholder(value)
  );
}

function isHttpsUrl(value, expectedPath) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.hash &&
      !url.search &&
      (!expectedPath || url.pathname === expectedPath) &&
      !["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function isHttpsOriginList(value) {
  const origins = value.split(",").map((origin) => origin.trim());
  return (
    origins.length > 0 &&
    origins.every((origin) => {
      try {
        const url = new URL(origin);
        return (
          url.protocol === "https:" &&
          url.origin === origin &&
          !["localhost", "127.0.0.1", "::1"].includes(url.hostname)
        );
      } catch {
        return false;
      }
    })
  );
}

function validateEnvironment() {
  if (process.env.NODE_ENV !== "production") {
    if (["development", "test"].includes(process.env.NODE_ENV)) return;
    throw new Error(
      "NODE_ENV must be production for deployment or development/test locally",
    );
  }

  const missing = requiredInProduction.filter(
    (key) => !process.env[key]?.trim(),
  );
  const invalid = [];
  const addInvalid = (name) => {
    if (!missing.includes(name) && !invalid.includes(name)) invalid.push(name);
  };

  for (const name of [
    "MONGODB_URI",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GMAIL_CLIENT_ID",
    "GMAIL_CLIENT_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ]) {
    const value = process.env[name]?.trim();
    if (value && isPlaceholder(value)) addInvalid(name);
  }

  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (jwtSecret && !isStrongJwtSecret(jwtSecret)) addInvalid("JWT_SECRET");

  const frontendUrl = process.env.FRONTEND_URL?.trim();
  if (frontendUrl && !isHttpsOriginList(frontendUrl)) {
    addInvalid("FRONTEND_URL");
  }

  const googleCallback = process.env.GOOGLE_CALLBACK_URL?.trim();
  if (
    googleCallback &&
    !isHttpsUrl(googleCallback, "/api/auth/google/callback")
  ) {
    addInvalid("GOOGLE_CALLBACK_URL");
  }

  const gmailRedirect = process.env.GMAIL_REDIRECT_URI?.trim();
  if (
    gmailRedirect &&
    !isHttpsUrl(gmailRedirect, "/api/gmail/callback")
  ) {
    addInvalid("GMAIL_REDIRECT_URI");
  }

  const gmailIssues = getGmailConfigurationIssues();
  for (const name of gmailIssues.invalid) addInvalid(name);

  if (process.env.COOKIE_SECURE !== "true") addInvalid("COOKIE_SECURE");
  if (process.env.COOKIE_SAME_SITE !== "none") {
    addInvalid("COOKIE_SAME_SITE");
  }

  if (missing.length || invalid.length) {
    const messages = [];
    if (missing.length) messages.push(`Missing: ${missing.join(", ")}`);
    if (invalid.length) messages.push(`Invalid: ${invalid.join(", ")}`);
    throw new Error(
      `Invalid production environment configuration. ${messages.join(". ")}`,
    );
  }
}

module.exports = {
  isStrongJwtSecret,
  validateEnvironment,
};
