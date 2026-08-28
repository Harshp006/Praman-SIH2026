/**
 * errorHandler.js — Global Express error handler
 * Must be registered last: app.use(errorHandler)
 */

"use strict";

module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status  = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (status >= 500) {
    console.error(`[ERROR] ${req.method} ${req.path} →`, err);
  }

  res.status(status).json({
    error:  message,
    ...(process.env.NODE_ENV !== "production" && status >= 500
      ? { stack: err.stack }
      : {}),
  });
};
