const db = require('./db');

/**
 * Inserts a user into the database or updates their status if they already exist.
 * @param {{username: string, isBlocked: boolean}} user - The user object.
 */
function upsertUser(user) {
  const status = user.isBlocked ? 'blocked' : 'active';

  // When inserting a new user, default expiration to a past date.
  // When updating, only the status is changed.
  const stmt = db.prepare(
    `INSERT INTO vpn_users (username, status, expiration_date) 
     VALUES (?, ?, '') 
     ON CONFLICT(username) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP`
  );

  stmt.run(user.username, status);
}

/**
 * Retrieves all usernames from the database.
 * @returns {string[]}
 */
function getAllUsernames() {
  const stmt = db.prepare('SELECT username FROM vpn_users');
  return stmt.all().map(row => row.username);
}

/**
 * Deletes a user from the database by their username.
 * @param {string} username - The username to delete.
 */
function deleteUserByUsername(username) {
  const stmt = db.prepare('DELETE FROM vpn_users WHERE username = ?');
  stmt.run(username);
}

module.exports = {
  upsertUser,
  getAllUsernames,
  deleteUserByUsername,
};
