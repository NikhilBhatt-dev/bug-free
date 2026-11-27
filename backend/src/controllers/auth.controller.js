const crypto = require("crypto");
const {
  GOOGLE_LOGIN_SCOPES,
  isGoogleLoginConfigured,
  passport,
} = require("../config/passport");
const {
  createLoginToken,
  findOrCreateGoogleUser,
  getPublicUser,
} = require("../services/auth.service");
const { ApiError } = require("../utils/apiError");
const {
  getAuthCookieOptions,
  getOAuthStateCookieOptions,
} = require("../utils/cookies");

const AUTH_COOKIE = "jobpilot_auth";
const OAUTH_STATE_COOKIE = "jobpilot_oauth_state";

function getFrontendRedirect(path) {
  const frontendOrigin = (
    process.env.FRONTEND_URL || "http://localhost:3000"
  )
    .split(",")[0]
    .trim();

  try {
    const url = new URL(frontendOrigin);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return new URL(path, url.origin).toString();
  } catch {
    throw new ApiError(
      503,
      "Frontend redirect is not configured",
      "FRONTEND_REDIRECT_NOT_CONFIGURED",
    );
  }
}

function clearOAuthState(res) {
  const { maxAge, ...clearOptions } = getOAuthStateCookieOptions();
  res.clearCookie(OAUTH_STATE_COOKIE, clearOptions);
}

function isValidOAuthState(req) {
  const received = req.query.state;
  const expected = req.cookies?.[OAUTH_STATE_COOKIE];
  if (typeof received !== "string" || typeof expected !== "string")
    return false;

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function startGoogleLogin(req, res, next) {
  if (!isGoogleLoginConfigured()) {
    return next(
      new ApiError(
        503,
        "Google login is not configured",
        "GOOGLE_LOGIN_NOT_CONFIGURED",
      ),
    );
  }

  const state = crypto.randomBytes(32).toString("base64url");
  res.cookie(OAUTH_STATE_COOKIE, state, getOAuthStateCookieOptions());

  return passport.authenticate("google", {
    session: false,
    scope: GOOGLE_LOGIN_SCOPES,
    state,
    prompt: "select_account",
  })(req, res, next);
}

function handleGoogleCallback(req, res, next) {
  if (!isValidOAuthState(req)) {
    clearOAuthState(res);
    return next(
      new ApiError(401, "Invalid OAuth login state", "OAUTH_STATE_INVALID"),
    );
  }

  clearOAuthState(res);

  return passport.authenticate(
    "google",
    { session: false },
    async (error, profile) => {
      if (error) return next(error);
      if (!profile)
      return res.redirect(
        getFrontendRedirect("/login?error=google_login_failed"),
      );

      try {
        const user = await findOrCreateGoogleUser(profile);
        const token = createLoginToken(user);
        res.cookie(AUTH_COOKIE, token, getAuthCookieOptions());
      return res.redirect(getFrontendRedirect("/dashboard"));
      } catch (serviceError) {
        return next(serviceError);
      }
    },
  )(req, res, next);
}

function getCurrentUser(req, res) {
  return res.status(200).json({
    success: true,
    message: "Authenticated user retrieved",
    data: { user: getPublicUser(req.user) },
    error: null,
  });
}

function logout(req, res) {
  const { maxAge, ...clearOptions } = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE, clearOptions);
  return res.status(200).json({
    success: true,
    message: "You have been signed out",
    data: null,
    error: null,
  });
}

module.exports = {
  getCurrentUser,
  handleGoogleCallback,
  logout,
  startGoogleLogin,
};
