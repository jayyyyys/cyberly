const { spawnSync } = require('child_process');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    process.exitCode = result.status || 1;
    return false;
  }
  return true;
}

function hasExplicitMigrationTestConfig() {
  return [
    'TEST_DB_HOST',
    'TEST_DB_USER',
    'TEST_DB_PASSWORD',
    'TEST_DB_ADMIN_DATABASE',
  ].every((key) => String(process.env[key] || '').trim());
}

const ok = run(process.execPath, ['scripts/test-migration-foundation-unit.js'], {
  cwd: __dirname + '/..',
});

if (!ok) {
  process.exit();
}

if (hasExplicitMigrationTestConfig()) {
  run(process.execPath, ['scripts/test-migrations.js'], {
    cwd: __dirname + '/..',
  });
} else {
  console.log('Skipping isolated migration DB test: TEST_DB_* configuration is not set.');
}

