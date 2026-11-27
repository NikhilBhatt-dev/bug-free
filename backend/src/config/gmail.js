const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

const REQUIRED_GMAIL_ENV = [
  "GMAIL_CLIENT_ID",
  "GMAIL_CLIENT_SECRET",
  "GMAIL_REDIRECT_URI",
  "GMAIL_TOKEN_ENCRYPTION_KEY",
];

function isPlaceholder(value) {
  return /<[^>]+>|^(?:example|your|replace|placeholder|default|change[-_ ]?me|test|sample|demo|dummy|fake|development|dev|local|insecure|secret|password)(?:[-_ ]|$)/i.test(
    value,
  );
}

function isValidRedirectUri(value) {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      url.pathname === "/api/gmail/callback"
    );
  } catch {
    return false;
  }
}

function isValidEncryptionKey(value) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    return false;
  }
  const key = Buffer.from(value, "base64");
  return key.length === 32 && key.toString("base64") === value;
}

function getGmailConfigurationIssues() {
  const missing = [];
  const invalid = [];

  for (const name of REQUIRED_GMAIL_ENV) {
    const value = process.env[name]?.trim();
    if (!value) {
      missing.push(name);
      continue;
    }
    if (isPlaceholder(value)) {
      invalid.push(name);
      continue;
    }
    if (
      (name === "GMAIL_CLIENT_ID" || name === "GMAIL_CLIENT_SECRET") &&
      /\s/.test(value)
    ) {
      invalid.push(name);
    } else if (name === "GMAIL_REDIRECT_URI" && !isValidRedirectUri(value)) {
      invalid.push(name);
    } else if (
      name === "GMAIL_TOKEN_ENCRYPTION_KEY" &&
      !isValidEncryptionKey(value)
    ) {
      invalid.push(name);
    }
  }

  return { missing, invalid };
}

function isGmailConfigured() {
  const { missing, invalid } = getGmailConfigurationIssues();
  return missing.length === 0 && invalid.length === 0;
}

function createGmailOAuthClient() {
  if (!isGmailConfigured()) return null;
  const { OAuth2Client } = require("google-auth-library");
  return new OAuth2Client(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI,
  );
}

module.exports = {
  createGmailOAuthClient,
  GMAIL_SEND_SCOPE,
  getGmailConfigurationIssues,
  isGmailConfigured,
};
