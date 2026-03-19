const axios = require('axios');
require('dotenv').config();

// In-memory storage for the SYSTEM auth token (used by scheduler)
let systemToken = null;
let systemTokenExpiresAt = null;

const openvpnApiClient = axios.create({
  baseURL: process.env.OPENVPN_API_URL,
});

/**
 * Logs into the OpenVPN server and returns the auth token and expiry.
 * @param {string} username - The admin username.
 * @param {string} password - The admin password.
 * @returns {Promise<{authToken: string, tokenExpiresAt: Date}>}
 */
async function login(username, password) {
  try {
    const response = await openvpnApiClient.post('/api/auth/login/userpassword', {
      username,
      password,
      request_admin: true,
    });

    return {
      authToken: response.data.auth_token,
      tokenExpiresAt: new Date(response.data.expires_after)
    };
  } catch (error) {
    console.error('OpenVPN login failed:', error.response ? error.response.data : error.message);
    throw new Error(error.response ? error.response.data.error || 'OpenVPN login failed.' : 'OpenVPN login failed.');
  }
}

/**
 * Checks if a given token is valid.
 * @param {string} token 
 * @param {Date|string} expiresAt 
 * @returns {boolean}
 */
function isTokenValid(token, expiresAt) {
  return token && expiresAt && new Date() < new Date(expiresAt);
}

/**
 * Gets a valid system token, logging in if necessary.
 * @returns {Promise<string>}
 */
async function getSystemToken() {
  if (!isTokenValid(systemToken, systemTokenExpiresAt)) {
    if (process.env.OPENVPN_USERNAME && process.env.OPENVPN_PASSWORD) {
      console.log('[System] OpenVPN system token is missing or expired. Logging in...');
      const creds = await login(process.env.OPENVPN_USERNAME, process.env.OPENVPN_PASSWORD);
      systemToken = creds.authToken;
      systemTokenExpiresAt = creds.tokenExpiresAt;
      console.log('[System] Successfully refreshed system token.');
    } else {
      throw new Error('No system credentials provided in .env for background tasks.');
    }
  }
  return systemToken;
}

/**
 * Blocks or unblocks a user.
 * @param {string} username - The username to modify.
 * @param {boolean} block - `true` to block, `false` to unblock.
 * @param {string} token - The auth token to use.
 * @returns {Promise<void>}
 */
async function setBlockUser(username, block, token) {
  if (!token) throw new Error('Auth token is required for OpenVPN requests.');
  
  try {
    await openvpnApiClient.post('/api/userprop/set', 
      [{ name: username, deny: block }], 
      { headers: { 'X-OpenVPN-AS-AuthToken': token } }
    );
    console.log(`Successfully set user ${username} block status to ${block}`);
  } catch (error) {
    console.error(`Error setting block status for user ${username}:`, error.response ? error.response.data : error.message);
    throw new Error('Failed to set user block status on OpenVPN server.');
  }
}

/**
 * Gets all user profiles from the OpenVPN server.
 * @param {string} token - The auth token to use.
 * @returns {Promise<Array>}
 */
async function getUsersFromProfiles(token) {
  if (!token) throw new Error('Auth token is required for OpenVPN requests.');

  try {
    const response = await openvpnApiClient.post('/api/users/list', 
      { offset: 0, page_size: 1000, order_by: "name", sort_by: "asc" },
      { headers: { 'X-OpenVPN-AS-AuthToken': token } }
    );
    return response.data.profiles;
  } catch (error) {
    console.error('Error getting profiles from OpenVPN server:', error.response ? error.response.data : error.message);
    throw new Error('Failed to get profiles from OpenVPN server.');
  }
}

module.exports = { login, isTokenValid, getSystemToken, setBlockUser, getUsersFromProfiles };
