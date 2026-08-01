const session = require('express-session');

class MySqlSessionStore extends session.Store {
  constructor(pool, ttlSeconds) {
    super();
    this.pool = pool;
    this.ttlSeconds = ttlSeconds;
  }

  getExpires(sessionData) {
    const cookieExpires = sessionData?.cookie?.expires;
    if (cookieExpires) return new Date(cookieExpires);
    return new Date(Date.now() + this.ttlSeconds * 1000);
  }

  get(sid, callback) {
    this.pool.query('SELECT data FROM sessions WHERE sid = ? AND expires > NOW() LIMIT 1', [sid])
      .then(([rows]) => {
        if (rows.length === 0) return callback(null, null);
        const data = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        callback(null, data);
      })
      .catch((error) => callback(error));
  }

  set(sid, sessionData, callback) {
    const expires = this.getExpires(sessionData);
    this.pool.query(
      `
        INSERT INTO sessions (sid, expires, data)
        VALUES (?, ?, CAST(? AS JSON))
        ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)
      `,
      [sid, expires, JSON.stringify(sessionData)]
    )
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  destroy(sid, callback) {
    this.pool.query('DELETE FROM sessions WHERE sid = ?', [sid])
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  touch(sid, sessionData, callback) {
    const expires = this.getExpires(sessionData);
    this.pool.query('UPDATE sessions SET expires = ? WHERE sid = ?', [expires, sid])
      .then(() => callback(null))
      .catch((error) => callback(error));
  }
}

module.exports = MySqlSessionStore;
