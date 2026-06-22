import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'QuantDeskBridge.cs'), 'utf8');

assert.match(source, /\{ "version", "0\.1\.8-readonly" \}/);
assert.match(source, /hourAlias == 1 \|\| hourAlias == 2 \|\| hourAlias == 4/);
assert.match(source, /hours == 1 \|\| hours == 2 \|\| hours == 4/);
assert.match(source, /minutes != 1 && minutes != 5 && minutes != 15 && minutes != 60 && minutes != 120 && minutes != 240/);

console.log('QuantDeskBridge source timeframe aliases verified.');
