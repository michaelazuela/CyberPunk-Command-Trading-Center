import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('tools/ninjatrader-bridge/QuantDeskScannerOverlay.cs', 'utf8');

assert.match(source, /class QuantDeskScannerOverlay : Indicator/);
assert.match(source, /Visual-only overlay/);
assert.match(source, /quant-desk-scanner-zones\.json/);
assert.match(source, /Draw\.Rectangle/);
assert.match(source, /Draw\.HorizontalLine/);
assert.match(source, /ShowLineInSand = false/);
assert.match(source, /if \(ShowLineInSand\)/);
assert.match(source, /scanner-zone-feed/);
assert.match(source, /OverlayMode = "Desk"/);
assert.match(source, /displayZones/);
assert.match(source, /RemoveDrawObject/);
assert.doesNotMatch(source, /\bSubmitOrder\b|\bEnterLong\b|\bEnterShort\b|\bExitLong\b|\bExitShort\b|\bAccount\.CreateOrder\b|\bChangeOrder\b|\bCancelOrder\b|\bFlatten\b/);
assert.match(source, /does not submit, change, cancel, reverse, flatten, or approve orders/i);

console.log('NinjaTrader scanner overlay source guard passed');
