// Standard response helpers - use these in all controllers for consistent response shapes.

function success(res, data, status = 200) {
  return res.status(status).json({ success: true, data })
}

function created(res, data) {
  return success(res, data, 201)
}

function error(res, message, code = 'BAD_REQUEST', status = 400) {
  return res.status(status).json({ success: false, code, message })
}

function notFound(res, message = 'Resource not found') {
  return error(res, message, 'NOT_FOUND', 404)
}

function forbidden(res, message = 'You do not have permission to perform this action.') {
  return error(res, message, 'FORBIDDEN', 403)
}

// Services throw these instead of touching res. A controller turns one into a response:
//   catch (err) { if (err.status) return error(res, err.message, err.code, err.status); throw err }
function appError(status, code, message) {
  const err = new Error(message)
  err.status = status
  err.code = code
  return err
}

// Placeholder handler for routes that exist but are not built yet (skeleton PR).
// The owner replaces it with a real controller function.
function notImplemented(owner) {
  return (req, res) => error(res, `${req.method} ${req.baseUrl}${req.path} is not built yet (owner: ${owner})`, 'NOT_IMPLEMENTED', 501)
}

module.exports = { success, created, error, notFound, forbidden, appError, notImplemented }
