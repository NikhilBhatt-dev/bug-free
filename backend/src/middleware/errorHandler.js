function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    data: null,
    error: { code: "NOT_FOUND" },
  });
}

function errorHandler(error, req, res, next) {
  let statusCode = error.statusCode || 500;
  let message = error.message;
  let code = error.code || "INTERNAL_SERVER_ERROR";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    code = "VALIDATION_ERROR";
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = "A record with these values already exists";
    code = "DUPLICATE_RECORD";
  }

  if (statusCode >= 500) {
    console.error("Unhandled request error", {
      method: req.method,
      path: req.originalUrl,
      message: error.message,
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "An unexpected error occurred" : message,
    data: null,
    error: { code, details: error.details || null },
  });
}

module.exports = { errorHandler, notFoundHandler };
