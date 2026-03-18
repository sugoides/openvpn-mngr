const axios = require('axios');
const { response } = require('express');
require('dotenv').config();

// In-memory storage for the auth token
let authToken = null;
let tokenExpiresAt = null;

const openvpnApiClient = axios.create({
  baseURL: process.env.OPENVPN_API_URL,
});

/**
 * Logs into the OpenVPN server and stores the auth token.
 * @param {string} username - The admin username.
 * @param {string} password - The admin password.
 * @returns {Promise<void>}
 */
async function login(username, password) {
  try {
    const response = await openvpnApiClient.post('/api/auth/login/userpassword', {
      username,
      password,
      request_admin: true,
    });

    authToken = response.data.auth_token;
    tokenExpiresAt = new Date(response.data.expires_after);

    console.log('Successfully logged into OpenVPN. Token expires at:', tokenExpiresAt);
  } catch (error) {
    console.error('OpenVPN login failed:', error.response ? error.response.data : error.message);
    authToken = null;
    tokenExpiresAt = null;
    throw new Error(error.response ? error.response.data.error || 'OpenVPN login failed.' : 'OpenVPN login failed.');
  }
}

/**
 * Logs out from the OpenVPN server by clearing the token.
 */
function logout() {
    authToken = null;
    tokenExpiresAt = null;
    console.log('Logged out from OpenVPN.');
}

/**
 * Checks if the current auth token is valid and not expired.
 * @returns {boolean}
 */
function isTokenValid() {
  return authToken && tokenExpiresAt && new Date() < tokenExpiresAt;
}

/**
 * Executes a request with the current auth token.
 * @param {Function} requestFn - A function that receives the axios client and token and executes a request.
 * @returns {Promise<any>}
 */
async function makeAuthenticatedRequest(requestFn) {
  if (!isTokenValid()) {
    throw new Error('OpenVPN auth token is missing or expired.');
  }
  return requestFn(openvpnApiClient, authToken);
}

/**
 * Blocks or unblocks a user.
 * @param {string} username - The username to modify.
 * @param {boolean} block - `true` to block, `false` to unblock.
 * @returns {Promise<void>}
 */
async function setBlockUser(username, block) {
  return makeAuthenticatedRequest(async (client, token) => {
    try {
      await client.post('/api/userprop/set', 
        [{ name: username, deny: block }], 
        { headers: { 'X-OpenVPN-AS-AuthToken': token } }
      );
      console.log(`Successfully set user ${username} block status to ${block}`);
    } catch (error) {
      console.error(`Error setting block status for user ${username}:`, error.response ? error.response.data : error.message);
      if (error.response && error.response.status === 401) {
          logout(); // Token is invalid, so log out
      }
      throw new Error('Failed to set user block status on OpenVPN server.');
    }
  });
}

/**
 * Gets all user profiles from the OpenVPN server.
 * @returns {Promise<Array>}
 */
async function getUsersFromProfiles() {
  return makeAuthenticatedRequest(async (client, token) => {
    try {
      const response = await client.post('/api/users/list', 
        { offset: 0, page_size: 1000, order_by: "name", sort_by: "asc" },
        { headers: { 'X-OpenVPN-AS-AuthToken': token } }
      );
      // console.log('OpenVPN /api/users/list response:', JSON.stringify(response.data, null, 2));
      return response.data.profiles;
    } catch (error) {
      console.error('Error getting profiles from OpenVPN server:', error.response ? error.response.data : error.message);
      if (error.response && error.response.status === 401) {
          logout(); // Token is invalid, so log out
      }
      throw new Error('Failed to get profiles from OpenVPN server.');
    }
  });
}

module.exports = { login, logout, isTokenValid, setBlockUser, makeAuthenticatedRequest, getUsersFromProfiles };
