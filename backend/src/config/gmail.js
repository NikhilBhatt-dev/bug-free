const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

function isGmailConfigured() {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REDIRECT_URI &&
      process.env.GMAIL_TOKEN_ENCRYPTION_KEY,
  );
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

module.exports = { createGmailOAuthClient, GMAIL_SEND_SCOPE, isGmailConfigured };
