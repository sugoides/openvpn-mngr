/**
 * Middleware to check if the user is authenticated.
 * It checks for a valid session.
 */
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required. Please log in again.' });
}

module.exports = { isAuthenticated };
