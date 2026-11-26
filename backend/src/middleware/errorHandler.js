function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    data: null,
    error: { code: "NOT_FOUND" },
  });
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error("Unhandled request error", {
      method: req.method,
      path: req.originalUrl,
      message: error.message,
    });
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500 ? "An unexpected error occurred" : error.message,
    data: null,
    error: { code: error.code || "INTERNAL_SERVER_ERROR" },
  });
}

module.exports = { errorHandler, notFoundHandler };
