const crypto = require("crypto");
const {
  connectGmail,
  createUserConnectionState,
  disconnectGmail,
  getAuthorizationUrl,
  getGmailConnection,
  verifyConnectionState,
} = require("../services/gmail.service");
const { ApiError } = require("../utils/apiError");
const { getOAuthStateCookieOptions } = require("../utils/cookies");

const OAUTH_STATE_COOKIE = "jobpilot_gmail_oauth_state";

function clearOAuthState(res) {
  const { maxAge, ...clearOptions } = getOAuthStateCookieOptions();
  res.clearCookie(OAUTH_STATE_COOKIE, clearOptions);
}

function matchesCookieState(received, expected) {
  if (typeof received !== "string" || typeof expected !== "string")
    return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function getFrontendRedirectUrl(outcome, reason) {
  const configuredOrigin = (
    process.env.FRONTEND_URL || "http://localhost:3000"
  )
    .split(",")[0]
    .trim();
  let frontendUrl;

  try {
    frontendUrl = new URL(configuredOrigin);
  } catch {
    throw new ApiError(
      503,
      "Frontend redirect is not configured",
      "FRONTEND_REDIRECT_NOT_CONFIGURED",
    );
  }

  if (!["http:", "https:"].includes(frontendUrl.protocol)) {
    throw new ApiError(
      503,
      "Frontend redirect is not configured",
      "FRONTEND_REDIRECT_NOT_CONFIGURED",
    );
  }

  const redirectUrl = new URL("/gmail", frontendUrl.origin);
  redirectUrl.searchParams.set("gmail", outcome);
  if (reason) redirectUrl.searchParams.set("reason", reason);
  return redirectUrl.toString();
}

async function startConnection(req, res) {
  const state = createUserConnectionState(req.user.id);
  const authorizationUrl = getAuthorizationUrl(state);
  res.cookie(
    OAUTH_STATE_COOKIE,
    state,
    getOAuthStateCookieOptions(),
  );
  return res.status(200).json({
    success: true,
    message: "Gmail authorization started",
    data: { authorizationUrl },
    error: null,
  });
}

async function handleCallback(req, res) {
  const state = req.query.state;
  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
  const validState =
    matchesCookieState(state, expectedState) &&
    verifyConnectionState(state, req.user.id);
  clearOAuthState(res);

  if (!validState) {
    return res.redirect(getFrontendRedirectUrl("error", "invalid_state"));
  }

  if (req.query.error) {
    const reason =
      req.query.error === "access_denied" ? "access_denied" : "oauth_denied";
    return res.redirect(getFrontendRedirectUrl("error", reason));
  }

  if (typeof req.query.code !== "string" || !req.query.code) {
    return res.redirect(getFrontendRedirectUrl("error", "missing_code"));
  }

  try {
    await connectGmail(req.user.id, req.query.code);
    return res.redirect(getFrontendRedirectUrl("connected"));
  } catch (error) {
    const safeReasons = new Set([
      "GMAIL_NOT_CONFIGURED",
      "GMAIL_OAUTH_EXCHANGE_FAILED",
      "GMAIL_REFRESH_TOKEN_MISSING",
    ]);
    const reason = safeReasons.has(error.code)
      ? error.code.toLowerCase()
      : "connection_failed";
    return res.redirect(getFrontendRedirectUrl("error", reason));
  }
}

async function getStatus(req, res) {
  const connection = await getGmailConnection(req.user.id);
  return res.status(200).json({
    success: true,
    message: "Gmail connection retrieved",
    data: { connection },
    error: null,
  });
}

async function disconnect(req, res) {
  await disconnectGmail(req.user.id);
  return res.status(200).json({
    success: true,
    message: "Gmail account disconnected",
    data: null,
    error: null,
  });
}

module.exports = { disconnect, getStatus, handleCallback, startConnection };
