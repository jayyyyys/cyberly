const { mapAccountRow } = require("./account.mapper");

const ACCOUNT_COLUMNS = `
  id,
  email,
  display_name,
  age,
  age_group,
  role,
  account_status,
  created_at,
  updated_at
`;

function createAccountRepository(pool) {
  async function findById(userId) {
    const [rows] = await pool.query(
      `SELECT ${ACCOUNT_COLUMNS}
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    return rows[0] || null;
  }

  async function updateById(userId, account) {
    const current = await findById(userId);

    if (!current) {
      return null;
    }

    const displayName =
      Object.prototype.hasOwnProperty.call(account, "displayName")
        ? account.displayName
        : current.display_name;

    const age =
      Object.prototype.hasOwnProperty.call(account, "age")
        ? account.age
        : current.age;

    const ageGroup =
      Object.prototype.hasOwnProperty.call(account, "ageGroup")
        ? account.ageGroup
        : current.age_group;

    await pool.query(
      `UPDATE users
       SET display_name = ?, age = ?, age_group = ?
       WHERE id = ?`,
      [displayName, age, ageGroup, userId]
    );

    return findById(userId);
  }

  return {
    findById,
    updateById,
    mapAccountRow,
  };
}

module.exports = {
  createAccountRepository,
};