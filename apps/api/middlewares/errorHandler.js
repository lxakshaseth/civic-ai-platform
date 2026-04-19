const { HttpError } = require('../utils/httpError')

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
}

function errorHandler(error, req, res, next) {
  void next

  const statusCode =
    error instanceof HttpError
      ? error.statusCode
      : Number.isInteger(error.statusCode)
        ? error.statusCode
        : 500

  if (statusCode >= 500) {
    console.error('Unhandled application error:', {
      path: req.originalUrl,
      method: req.method,
      message: error.message,
      stack: error.stack,
    })
  }

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(error.details ? { details: error.details } : {}),
  })
}

module.exports = {
  notFoundHandler,
  errorHandler,
}
