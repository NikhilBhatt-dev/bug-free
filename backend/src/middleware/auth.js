const { ApiError } = require("../utils/apiError");
const { verifyAccessToken } = require("../utils/jwt");

function getRequestToken(req) {
  const authorization = req.get("authorization");
  if (authorization?.startsWith("Bearer "))
    return authorization.slice(7).trim();
  return req.cookies?.jobpilot_auth;
}

function authenticate(req, res, next) {
  const token = getRequestToken(req);
  if (!token) {
    return next(
      new ApiError(401, "Authentication is required", "AUTH_REQUIRED"),
    );
  }

  try {
    const claims = verifyAccessToken(token);
    req.user = { id: claims.sub, email: claims.email, role: claims.role };
    return next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    return next(
      new ApiError(401, "Your session is invalid or expired", "AUTH_INVALID"),
    );
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user)
      return next(
        new ApiError(401, "Authentication is required", "AUTH_REQUIRED"),
      );
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          "You do not have permission for this action",
          "FORBIDDEN",
        ),
      );
    }
    return next();
  };
}

function requireSelf(paramName = "userId") {
  return (req, res, next) => {
    if (!req.user)
      return next(
        new ApiError(401, "Authentication is required", "AUTH_REQUIRED"),
      );
    if (req.user.id !== req.params[paramName]) {
      return next(
        new ApiError(
          403,
          "You cannot access another user's data",
          "RESOURCE_FORBIDDEN",
        ),
      );
    }
    return next();
  };
}

function requireSameOrigin(req, res, next) {
  const origin = req.get("origin");
  if (!origin) return next();

  const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((value) => value.trim());

  if (!allowedOrigins.includes(origin)) {
    return next(
      new ApiError(403, "Request origin is not allowed", "ORIGIN_FORBIDDEN"),
    );
  }

  return next();
}

module.exports = { authenticate, requireRole, requireSameOrigin, requireSelf };
