const { isTokenValid } = require('../services/openvpn');

/**
 * Middleware to check if the user is authenticated.
 * It checks for a valid session.
 */
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated && isTokenValid(req.session.openvpnToken, req.session.openvpnTokenExpiresAt)) {
    return next();
  }

  // Redirect to login page for browser navigation, send 401 for API calls
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.redirect('/login.html');
  }

  res.status(401).json({ error: 'Authentication required. Please log in again.' });
}

module.exports = { isAuthenticated };
