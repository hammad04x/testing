const bcrypt = require('bcrypt');
const connection = require('../../connection/connection');
const { generateAccessToken } = require('../../utils/jwtUtils');

const login = (req, res) => {
  const { identifier, password } = req.body;
  const ip = req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';


  if (!identifier || !password) {
    console.error('Missing identifier or password');
    return res.status(400).json({ error: 'Identifier and password are required' });
  }

const sql = "SELECT * FROM admin WHERE (email = ? OR number = ?)";

connection.query(sql, [identifier, identifier], async (err, results) => {
  if (err) {
    console.error('Database error during login:', err);
    return res.status(500).json({ error: 'Database error' });
  }
  if (results.length === 0) {
    console.error('No admin found for identifier:', identifier);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const admin = results[0];

  // 🚨 Blocked user check
  if (admin.status === 'blocked') {
    console.error('Blocked admin tried to login:', admin.id);
    return res.status(403).json({ error: 'Your account is blocked. Please contact support.' });
  }

  // ✅ Active user check
  if (admin.status !== 'active') {
    console.error('Inactive admin tried to login:', admin.id);
    return res.status(403).json({ error: 'Your account is not active.' });
  }

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) {
    console.error('Invalid password for admin:', admin.id);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // 🗑 Kill old tokens
  connection.query(
    'UPDATE active_tokens SET is_blacklisted = 1 WHERE admin_id = ? AND is_blacklisted = 0',
    [admin.id],
    (err) => {
      if (err) console.error('Error blacklisting existing tokens:', err);
    }
  );

  const { token: accessToken, jti } = generateAccessToken(admin, ip, userAgent);
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 60 * 1000);

  connection.query(
    'INSERT INTO active_tokens (token_id, admin_id, ip_address, user_agent, issued_at, last_activity, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [jti, admin.id, ip, userAgent, now, now, expires],
    (err) => {
      if (err) {
        console.error('Error inserting token:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }
      res.json({ accessToken, admin: { id: admin.id, name: admin.name, email: admin.email } });
    }
  );
});

};


const refreshToken = (req, res) => {
  const { jti, id: adminId } = req.admin;
  const ip = req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';


  connection.query(
    'SELECT * FROM active_tokens WHERE token_id = ? AND admin_id = ? AND is_blacklisted = 0',
    [jti, adminId],
    (err, results) => {
      if (err) {
        console.error('Database error during token refresh:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) {
        console.error(`Token ${jti} invalidated or not found for admin ${adminId}`);
        return res.status(401).json({ error: 'Token invalidated or not found' });
      }

      const tokenData = results[0];
      const now = new Date();
      const issuedAt = new Date(tokenData.issued_at);
      const lastActivity = new Date(tokenData.last_activity);
      const expiresAt = new Date(tokenData.expires_at);
      const timeSinceIssue = now - issuedAt;
      const activityDiff = lastActivity - issuedAt;


      if (timeSinceIssue < 13 * 60 * 1000) {
        return res.json({ accessToken: req.headers['authorization'].split(' ')[1] });
      }

      if (activityDiff < 1000) {
        connection.query('UPDATE active_tokens SET is_blacklisted = 1 WHERE token_id = ?', [jti]);
        return res.status(401).json({ error: 'No activity detected, session expired' });
      }

      connection.query('SELECT * FROM admin WHERE id = ?', [adminId], (err, adminResults) => {
        if (err || adminResults.length === 0) {
          console.error(`Admin ${adminId} not found during token refresh`);
          return res.status(401).json({ error: 'User not found' });
        }

        const admin = adminResults[0];
        connection.query('UPDATE active_tokens SET is_blacklisted = 1 WHERE token_id = ?', [jti], () => {
          const { token: newToken, jti: newJti } = generateAccessToken(admin, ip, userAgent);
          const newExpires = new Date(now.getTime() + 30 * 60 * 1000);

          connection.query(
            'INSERT INTO active_tokens (token_id, admin_id, ip_address, user_agent, issued_at, last_activity, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newJti, adminId, ip, userAgent, now, now, newExpires],
            (err) => {
              if (err) {
                console.error('Error inserting new token:', err);
                return res.status(500).json({ error: 'Failed to refresh token' });
              }
              res.json({ accessToken: newToken });
            }
          );
        });
      });
    }
  );
};

const updateActivity = (req, res) => {
  const { jti, id: adminId } = req.admin;
  const now = new Date();

  connection.query(
    'UPDATE active_tokens SET last_activity = ? WHERE token_id = ? AND admin_id = ? AND is_blacklisted = 0',
    [now, jti, adminId],
    (err) => {
      if (err) {
        console.error(`Failed to update activity for admin ${adminId}:`, err);
        return res.status(500).json({ error: 'Failed to update activity' });
      }
      res.json({ message: 'Activity updated' });
    }
  );
};

const logout = (req, res) => {
  const { jti, id: adminId } = req.admin;
  connection.query(
    'UPDATE active_tokens SET is_blacklisted = 1 WHERE token_id = ? AND admin_id = ?',
    [jti, adminId],
    (err) => {
      if (err) {
        console.error(`Logout failed for admin ${adminId}:`, err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    }
  );
};

const getAgencyById = (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    console.error('Invalid admin ID:', id);
    return res.status(400).json({ error: 'Invalid admin ID' });
  }

  connection.query(
    'SELECT id, name, email, number, status, createdat, updatedat FROM admin WHERE id = ?',
    [id],
    (err, results) => {
      if (err) {
        console.error('Database error fetching admin:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) {
        console.error(`Admin ${id} not found`);
        return res.status(404).json({ error: 'Admin not found' });
      }
      res.json(results[0]);
    }
  );
};

module.exports = {
  login,
  refreshToken,
  updateActivity,
  logout,
  getAgencyById
};
