// utils/tokenCleanup.js
const connection = require('../connection/connection');

const updateExpiredTokens = () => {
  const now = new Date();
  connection.query(
    "UPDATE active_tokens SET is_blacklisted = 1 WHERE expires_at < ? AND is_blacklisted = 0",
    [now],
    (err) => {
      if (err) {
        console.error('Error cleaning up expired tokens:', err);
      }
    }
  );
};

const cleanupExpiredTokens = () => {
  const query = `DELETE FROM active_tokens WHERE is_blacklisted = 1`;
  
  connection.query(query, (err) => {
    if (err) {
      console.error("Error cleaning up expired tokens:", err);
    }
  });
};

// Combined cleanup function to run both tasks
const runTokenCleanup = () => {
  updateExpiredTokens();
  cleanupExpiredTokens();
};

module.exports = { runTokenCleanup };
