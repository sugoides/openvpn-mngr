const { isTokenValid } = require('../services/openvpn');

/**
 * Middleware to check if the user is authenticated.
 * It checks for a valid session and a valid OpenVPN token.
 */
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated && isTokenValid()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required. Please log in again.' });
}

module.exports = { isAuthenticated };
