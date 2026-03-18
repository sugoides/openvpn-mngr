const cron = require('node-cron');
const db = require('./db');
const { setBlockUser, isTokenValid } = require('./services/openvpn');
const { autoLogin } = require('./index.js')
/**
 * Checks for expired users and blocks them.
 */
async function checkAndBlockExpiredUsers() {
  console.log('Running expiration check...');

  if (!isTokenValid()) {
      console.log('OpenVPN token is not valid. Re-authenticating.');
      await autoLogin();
      return;
  }

  const stmt = db.prepare("SELECT * FROM vpn_users WHERE status = 'active' AND datetime(expiration_date) <= datetime('now')");
  const expiredUsers = stmt.all();

  if (expiredUsers.length === 0) {
    console.log('No expired users found.');
    return;
  }

  const blockPromises = expiredUsers.map(user => {
    console.log(`User ${user.username} has expired. Blocking...`);
    return setBlockUser(user.username, true)
      .then(() => {
        const updateStmt = db.prepare('UPDATE vpn_users SET status = ? WHERE id = ?');
        updateStmt.run('blocked', user.id);
        console.log(`User ${user.username} has been marked as blocked (due to expiration).`);
      })
      .catch(error => {
        console.error(`Failed to block expired user ${user.username}:`, error.message);
      });
  });

  try {
    await Promise.all(blockPromises);
  } catch (error) {
      console.error('An error occurred while blocking users in parallel:', error);
  }
}

/**
 * Starts the cron job to check for expired users every minute.
 */
function startScheduler() {
  cron.schedule('* * * * *', checkAndBlockExpiredUsers);
  console.log('Scheduler started. Will check for expired users every minute.');
}

module.exports = { startScheduler };
