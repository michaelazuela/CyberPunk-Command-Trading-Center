const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const packagePath = path.resolve(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const commandText = packageJson.scripts && packageJson.scripts['test:commands'];

if (!commandText) {
  console.error('Missing package.json scripts.test:commands.');
  process.exit(1);
}

const commands = commandText
  .split(/\s+&&\s+/)
  .map((command) => command.trim())
  .filter(Boolean);

for (const command of commands) {
  console.log(`\n[test-suite] ${command}`);
  const result = spawnSync(command, {
    cwd: path.resolve(__dirname, '..'),
    shell: true,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
