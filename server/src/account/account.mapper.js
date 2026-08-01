function toIso(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function mapAccountRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    age: row.age,
    ageGroup: row.age_group,
    role: row.role,
    accountStatus: row.account_status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

module.exports = {
  mapAccountRow,
};