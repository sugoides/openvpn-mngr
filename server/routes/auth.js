const express = require('express');
const router = express.Router();
const { login, logout } = require('../services/openvpn');
const { syncUsers } = require('../usersync');

// POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    await login(username, password);
    req.session.isAuthenticated = true;

    await syncUsers();

    res.status(200).json({ message: 'Login successful.' });
  } catch (error) {
    req.session.isAuthenticated = false;
    res.status(401).json({ error: 'Invalid credentials.' });
  }
});

// POST /api/logout
router.post('/logout', (req, res) => {
  logout(); // Clear the OpenVPN token
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out, please try again.' });
    }
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.status(200).json({ message: 'Logout successful.' });
  });
});

module.exports = router;
