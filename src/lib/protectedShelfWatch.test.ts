import assert from 'node:assert/strict';
import { detectProtectedShelfWatch, type ProtectedShelfBar } from './protectedShelfWatch';

function bar(time: string, open: number, high: number, low: number, close: number): ProtectedShelfBar {
  return { time, open, high, low, close };
}

const june25Fifteen = [
  bar('2026-06-25T08:45:00', 7478, 7496.25, 7477.5, 7485.25),
  bar('2026-06-25T09:00:00', 7485.25, 7492.75, 7481.5, 7486.75),
  bar('2026-06-25T09:15:00', 7486.75, 7489, 7478.75, 7483.75),
  bar('2026-06-25T09:30:00', 7483.75, 7488.25, 7479, 7485.75),
  bar('2026-06-25T09:45:00', 7485.75, 7490.5, 7437.25, 7439),
];

const june25Five = [
  bar('2026-06-25T09:15:00', 7484.25, 7489, 7478.75, 7483.75),
  bar('2026-06-25T09:20:00', 7483.75, 7486.75, 7480, 7482),
  bar('2026-06-25T09:25:00', 7482.25, 7487.75, 7481.25, 7485.75),
  bar('2026-06-25T09:30:00', 7485.75, 7488.25, 7479, 7485.75),
  bar('2026-06-25T09:35:00', 7485.75, 7490.5, 7463.75, 7469.75),
];

const shortWatch = detectProtectedShelfWatch({
  fiveMinuteBars: june25Five,
  fifteenMinuteBars: june25Fifteen,
});

assert.equal(shortWatch.direction, 'SHORT');
assert.equal(shortWatch.shelfTimeframe, '15M');
assert.equal(shortWatch.shelfKind, 'resistance_failure');
assert.equal(shortWatch.entry, 7485.75);
assert.equal(shortWatch.stop, 7490.75);
assert.equal(shortWatch.target1, 7478.25);
assert.equal(shortWatch.target2, 7475.75);
assert.equal(shortWatch.proofTime, '2026-06-25T09:35:00');
assert.equal(shortWatch.authority.htfShelfApprovesTrades, false);
assert.equal(shortWatch.authority.completed5mProofRequired, true);

const shortFormingWatch = detectProtectedShelfWatch({
  fiveMinuteBars: june25Five.slice(0, 4),
  fifteenMinuteBars: june25Fifteen,
});

assert.equal(shortFormingWatch.state, 'forming');
assert.equal(shortFormingWatch.direction, 'SHORT');
assert.equal(shortFormingWatch.shelfKind, 'resistance_failure');
assert.equal(shortFormingWatch.entry, null);
assert.equal(shortFormingWatch.stop, null);
assert.equal(shortFormingWatch.target1, null);
assert.match(shortFormingWatch.missingEvidence.join(' '), /completed 5M/i);

const june26Fifteen = [
  bar('2026-06-26T08:45:00', 7394.5, 7397, 7383.5, 7384),
  bar('2026-06-26T09:00:00', 7383.75, 7386.75, 7380, 7383.75),
  bar('2026-06-26T09:15:00', 7384.25, 7385, 7373.25, 7376.75),
  bar('2026-06-26T09:30:00', 7376.75, 7382.75, 7364.5, 7380.75),
  bar('2026-06-26T09:45:00', 7381, 7388.25, 7360, 7384.25),
  bar('2026-06-26T10:00:00', 7384.25, 7405.5, 7371.25, 7403.5),
];

const june26Five = [
  bar('2026-06-26T09:35:00', 7381, 7388.25, 7360, 7370.25),
  bar('2026-06-26T09:40:00', 7370.25, 7383.25, 7367.25, 7372.75),
  bar('2026-06-26T09:45:00', 7373, 7386.5, 7368.75, 7384.25),
  bar('2026-06-26T09:50:00', 7384.25, 7390.25, 7371.25, 7379),
  bar('2026-06-26T09:55:00', 7378.75, 7389, 7377, 7385.75),
  bar('2026-06-26T10:00:00', 7386, 7405.5, 7384, 7403.5),
];

const longWatch = detectProtectedShelfWatch({
  fiveMinuteBars: june26Five,
  fifteenMinuteBars: june26Fifteen,
});

assert.equal(longWatch.direction, 'LONG');
assert.equal(longWatch.shelfKind, 'support_failure');
assert.equal(longWatch.entry, 7383);
assert.equal(longWatch.stop, 7368.5);
assert.equal(longWatch.target1, 7404.75);
assert.equal(longWatch.target2, 7412);
assert.equal(longWatch.proofTime, '2026-06-26T09:45:00');
assert.equal(longWatch.state, 'proof_completed');
assert.equal(longWatch.noChaseReason, null);

const dataLimited = detectProtectedShelfWatch({
  fiveMinuteBars: june26Five.slice(0, 2),
  fifteenMinuteBars: june26Fifteen,
});
assert.equal(dataLimited.state, 'data_limited');

console.log('protected shelf watch detector verified');
