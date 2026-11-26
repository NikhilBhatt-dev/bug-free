const jwt = require("jsonwebtoken");
const { ApiError } = require("./apiError");

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new ApiError(
      503,
      "Authentication is not configured",
      "AUTH_NOT_CONFIGURED",
    );
  }

  return process.env.JWT_SECRET;
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      issuer: "jobpilot-api",
      audience: "jobpilot-web",
    },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    issuer: "jobpilot-api",
    audience: "jobpilot-web",
  });
}

module.exports = { signAccessToken, verifyAccessToken };
