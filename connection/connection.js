const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createPool({
    host: 'sheetalsweets.iqravoice.com', // live host
  user: 'u543309113_sheetal',
  password: 'Sheetalsweets@2025',
  database: 'u543309113_hello_world',
  waitForConnections: true, // Wait for a connection if all are in use
  connectionLimit: 10,      // Maximum number of connections in the pool
  queueLimit: 0, 
});

// Optional: Test the pool by getting a connection
connection.getConnection((err, conn) => {
  if (err) {
    console.error('Database pool connection failed:', err);
    return;
  }
  console.log('Database pool connected successfully');
  conn.release(); // Release the connection back to the pool
});

module.exports = connection;
module.exports.API_KEY = process.env.API_KEY;
