const { getUsersFromProfiles } = require('./services/openvpn');
const { upsertUser, getAllUsernames, deleteUserByUsername } = require('./data');

/**
 * Fetches user profiles from OpenVPN and synchronizes the local database.
 * It adds/updates users present on the server and removes users that are not.
 */
async function syncUsers() {
  console.log('Starting user sync from OpenVPN...');
  try {
    const profiles = await getUsersFromProfiles() || [];
    const openvpnUsernames = profiles.map(p => p.name);

    // Upsert users from OpenVPN
    if (profiles.length > 0) {
      console.log(`Found ${profiles.length} user profiles on OpenVPN. Syncing to local DB...`);
      for (const profile of profiles) {
        upsertUser({ username: profile.name, isBlocked: profile.deny.value });
      }
      console.log('Upsert complete.');
    }

    // Delete users that are in DB but not in OpenVPN
    const dbUsernames = getAllUsernames();
    const usersToDelete = dbUsernames.filter(dbUser => !openvpnUsernames.includes(dbUser));

    if (usersToDelete.length > 0) {
      console.log(`Deleting ${usersToDelete.length} users from local DB that are no longer on the OpenVPN server...`);
      for (const username of usersToDelete) {
        deleteUserByUsername(username);
        console.log(`- Deleted ${username}`);
      }
      console.log('Deletion complete.');
    }
    
    console.log('User profile sync finished successfully.');

  } catch (syncError) {
    console.error('Failed to sync users from OpenVPN:', syncError.message);
  }
}

module.exports = { syncUsers };
