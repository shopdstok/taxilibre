/**
 * Response formatting utilities
 */

const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
};

const sendError = (res, message = 'Internal Server Error', statusCode = 500, details = null) => {
  const error = {
    code: statusCode,
    message,
    ...(details && { details })
  };
  res.status(statusCode).json({
    success: false,
    error,
    timestamp: new Date().toISOString()
  });
};

const sendPaginated = (res, data, pagination, message = 'Success') => {
  res.status(200).json({
    success: true,
    data,
    pagination,
    message,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated
};
