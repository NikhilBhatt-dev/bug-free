function isSecureCookie() {
  return (
    process.env.COOKIE_SECURE === "true" ||
    process.env.NODE_ENV === "production"
  );
}

function getSameSite() {
  const configured = process.env.COOKIE_SAME_SITE;
  if (["lax", "strict", "none"].includes(configured)) return configured;
  return "lax";
}

function getAuthCookieOptions() {
  const sameSite = getSameSite();
  return {
    httpOnly: true,
    secure: sameSite === "none" ? true : isSecureCookie(),
    sameSite,
    maxAge: Number(process.env.AUTH_COOKIE_MAX_AGE_MS) || 60 * 60 * 1000,
    path: "/",
  };
}

function getOAuthStateCookieOptions() {
  const options = getAuthCookieOptions();
  return { ...options, maxAge: 10 * 60 * 1000 };
}

module.exports = { getAuthCookieOptions, getOAuthStateCookieOptions };
