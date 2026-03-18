const schedule = require('node-schedule');
const db = require('./db');
const { setBlockUser } = require('./services/openvpn');

// In-memory storage for scheduled jobs
const scheduledJobs = new Map();

/**
 * Blocks a specific user and updates the database.
 * @param {string} username - The username to block.
 */
async function blockUserAction(username) {
  console.log(`[Scheduler] User ${username} has expired. Blocking...`);
  try {
    await setBlockUser(username, true);
    const updateStmt = db.prepare("UPDATE vpn_users SET status = 'blocked' WHERE username = ?");
    updateStmt.run(username);
    console.log(`[Scheduler] User ${username} has been marked as blocked (due to expiration).`);
  } catch (error) {
    console.error(`[Scheduler] Failed to block expired user ${username}:`, error.message);
  } finally {
    scheduledJobs.delete(username);
  }
}

/**
 * Schedules a blocking job for a user at a specific expiration date.
 * If a job already exists for the user, it is canceled and rescheduled.
 * @param {string} username - The username to schedule.
 * @param {string|Date} expirationDate - The date/time when access expires.
 */
function scheduleUserBlocking(username, expirationDate) {
  // Cancel existing job if any
  cancelUserBlocking(username);

  if (!expirationDate) {
    console.log(`[Scheduler] Skipping scheduling for ${username}: No expiration date set.`);
    return;
  }

  const date = new Date(expirationDate);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.error(`[Scheduler] Skipping scheduling for ${username}: Invalid expiration date format ("${expirationDate}").`);
    return;
  }
  
  // If the date is in the past, block immediately
  if (date <= new Date()) {
    console.log(`[Scheduler] Expiration date for ${username} is in the past (${expirationDate}). Blocking now.`);
    blockUserAction(username);
    return;
  }

  console.log(`[Scheduler] Scheduling block for ${username} at ${date.toISOString()} (Asia/Manila: ${date.toLocaleString('en-US', { timeZone: 'Asia/Manila' })})`);

  const job = schedule.scheduleJob(date, async () => {
    await blockUserAction(username);
  });

  if (job) {
    scheduledJobs.set(username, job);
  } else {
    console.error(`[Scheduler] Failed to schedule job for ${username}.`);
  }
}

/**
 * Cancels a scheduled blocking job for a user.
 * @param {string} username - The username to cancel.
 */
function cancelUserBlocking(username) {
  const existingJob = scheduledJobs.get(username);
  if (existingJob) {
    existingJob.cancel();
    scheduledJobs.delete(username);
    console.log(`[Scheduler] Canceled existing block job for ${username}.`);
  }
}

/**
 * Initializes the scheduler by loading all 'active' users from the database.
 */
function initScheduler() {
  console.log('[Scheduler] Initializing: Scheduling block jobs for all active users...');
  
  const activeUsers = db.prepare("SELECT username, expiration_date FROM vpn_users WHERE status = 'active'").all();
  
  activeUsers.forEach(user => {
    scheduleUserBlocking(user.username, user.expiration_date);
  });

  console.log(`[Scheduler] Initialization complete. Scheduled ${scheduledJobs.size} jobs.`);
}

module.exports = { initScheduler, scheduleUserBlocking, cancelUserBlocking };
