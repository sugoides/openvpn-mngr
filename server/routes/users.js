const express = require('express');
const router = express.Router();
const db = require('../db');
const { setBlockUser, getUsersFromProfiles } = require('../services/openvpn');
const { scheduleUserBlocking, cancelUserBlocking } = require('../scheduler');

// GET /api/users - Get all users
router.get('/', async (req, res) => {
  try {
    const [vpnProfiles, localUsers] = await Promise.all([
      getUsersFromProfiles(),
      db.prepare('SELECT * FROM vpn_users').all()
    ]);

    const localUsersMap = new Map(localUsers.map(u => [u.username, u]));

    const allUsers = vpnProfiles.map(profile => {
      const localUser = localUsersMap.get(profile.name);
      const isBlocked = profile.deny && profile.deny.value === true;
      
      let status = 'active';
      if (localUser) {
        status = localUser.status;
      } else if (isBlocked) {
        status = 'blocked';
      }

      return {
        username: profile.name,
        status: status,
        expiration_date: localUser ? localUser.expiration_date : null,
        created_at: localUser ? localUser.created_at : null,
        updated_at: localUser ? localUser.updated_at : null,
      };
    });

    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// POST /api/users/grant - Grant access to a user
router.post('/grant', async (req, res) => {
  const { username, expiration_date } = req.body;
  if (!username || !expiration_date) {
    return res.status(400).json({ error: 'Username and expiration date are required.' });
  }

  try {
    await setBlockUser(username, false); // Unblock user

    const existingUser = db.prepare('SELECT id FROM vpn_users WHERE username = ?').get(username);

    let user;
    if (existingUser) {
      const stmt = db.prepare('UPDATE vpn_users SET status = ?, expiration_date = ? WHERE username = ? RETURNING *');
      user = stmt.get('active', expiration_date, username);
    } else {
      const stmt = db.prepare('INSERT INTO vpn_users (username, status, expiration_date) VALUES (?, ?, ?) RETURNING *');
      user = stmt.get(username, 'active', expiration_date);
    }

    // Schedule the block job
    scheduleUserBlocking(username, expiration_date);

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to grant access.' });
  }
});

// POST /api/users/extend - Extend access for a user
router.post('/extend', async (req, res) => {
  const { username, expiration_date } = req.body;
  if (!username || !expiration_date) {
    return res.status(400).json({ error: 'Username and new expiration date are required.' });
  }

  try {
    await setBlockUser(username, false); // Unblock user

    const stmt = db.prepare('UPDATE vpn_users SET expiration_date = ?, status = ? WHERE username = ? RETURNING *');
    const user = stmt.get(expiration_date, 'active', username);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Reschedule the block job
    scheduleUserBlocking(username, expiration_date);

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to extend access.' });
  }
});

// POST /api/users/block - Block a user
router.post('/block', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required.' });
  }

  try {
    await setBlockUser(username, true); // Block user

    // Cancel any scheduled block job
    cancelUserBlocking(username);

    const stmt = db.prepare("UPDATE vpn_users SET status = 'blocked' WHERE username = ?");
    const result = stmt.run(username);

    if (result.changes === 0) {
      const insertStmt = db.prepare('INSERT INTO vpn_users (username, status, expiration_date) VALUES (?, ?, ?)');
      insertStmt.run(username, 'blocked', new Date().toISOString());
      return res.status(200).json({ message: 'User blocked and added to database.' });
    }
    
    res.json({ message: 'User blocked successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to block user.' });
  }
});
// POST /api/users/unblock - unBlock a user
router.post('/unblock', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required.' });
  }

  try {
    await setBlockUser(username, false); // Unblock user

    // Cancel any scheduled block job (though there shouldn't be one if it was blocked)
    cancelUserBlocking(username);

    const stmt = db.prepare("UPDATE vpn_users SET status = 'active' WHERE username = ?");
    const result = stmt.run(username);

    if (result.changes === 0) {
      const insertStmt = db.prepare('INSERT INTO vpn_users (username, status) VALUES (?, ?, ?)');
      insertStmt.run(username, 'active');
      return res.status(200).json({ message: 'User unblocked and added to database.' });
    }
    
    res.json({ message: 'User unblocked successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to unblock user.' });
  }
});

module.exports = router;
