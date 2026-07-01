import assert from 'node:assert/strict';
import { readCliArgValue } from './cli-args';

assert.equal(readCliArgValue(['node', 'tool', '--bridge-instrument', 'MES 09-26'], 'bridge-instrument'), 'MES 09-26');
assert.equal(readCliArgValue(['node', 'tool', '--bridge-instrument', '"MES', '09-26"'], 'bridge-instrument'), 'MES 09-26');
assert.equal(readCliArgValue(['node', 'tool', '--bridge-instrument', '\\"MES', '09-26\\"'], 'bridge-instrument'), 'MES 09-26');
assert.equal(readCliArgValue(['node', 'tool', '--bridge-instrument="MES 09-26"'], 'bridge-instrument'), 'MES 09-26');
assert.equal(readCliArgValue(['node', 'tool', '--instrument', 'MES'], 'instrument'), 'MES');
assert.equal(readCliArgValue(['node', 'tool'], 'bridge-instrument'), null);

console.log('Automation CLI arg parsing verified.');
