import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET = path.join(ROOT, 'tools', 'automation', 'overnight-raid-acceptance-fvg-research.ts');
const FORBIDDEN_DETECTOR_TIMES = ['T12:30:00', 'T13:00:00', 'T13:30:00'];

if (!fs.existsSync(TARGET)) {
  console.log('✅ FVG research window guard skipped: research script not present.');
  process.exit(0);
}

const content = fs.readFileSync(TARGET, 'utf8');
const helperStart = content.indexOf('function researchWindowFor(');
const helperEnd = content.indexOf('\nfunction roundTick', helperStart);

if (helperStart < 0 || helperEnd < 0) {
  console.error('❌ FVG research window guard failed: missing centralized researchWindowFor(...) helper.');
  process.exit(1);
}

const contentOutsideHelper = `${content.slice(0, helperStart)}${content.slice(helperEnd)}`;
const failures = FORBIDDEN_DETECTOR_TIMES.filter((time) => contentOutsideHelper.includes(time));

if (failures.length) {
  console.error('❌ Hidden FVG research session cutoffs found outside researchWindowFor(...):');
  failures.forEach((time) => console.error(`- ${time}`));
  console.error('\nUse the explicit --session window contract instead of hardcoded detector cutoffs.');
  process.exit(1);
}

if (!content.includes('session: ResearchSession') || !content.includes('parseSession(')) {
  console.error('❌ FVG research window guard failed: session-aware CLI contract is missing.');
  process.exit(1);
}

console.log('✅ FVG research window guard passed.');
