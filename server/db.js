const Database = require('better-sqlite3');
// Connect to the database, creating the file if it doesn't exist
const db = new Database('vpn_access_v2.db');

/**
 * Initializes the database schema.
 */
function initDatabase() {
  const stmt = db.prepare(`
    CREATE TABLE IF NOT EXISTS vpn_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK(status IN ('active', 'blocked', 'expired')),
      expiration_date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  stmt.run();
}

/**
 * A trigger to automatically update the 'updated_at' timestamp.
 */
function createUpdateTrigger() {
    const stmt = db.prepare(`
        CREATE TRIGGER IF NOT EXISTS update_vpn_users_updated_at
        AFTER UPDATE ON vpn_users
        FOR EACH ROW
        BEGIN
            UPDATE vpn_users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
        END;
    `);
    stmt.run();
}

// Initialize the database and trigger on startup
initDatabase();
createUpdateTrigger();

console.log('Database initialized successfully.');

module.exports = db;
