import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const distDir = path.join(repoRoot, 'dist');
const port = Number(process.env.QUANT_DESK_COMPANION_PORT || 8787);
const bridgeTarget = process.env.QUANT_DESK_BRIDGE_URL || 'http://127.0.0.1:8765';

const app = express();

app.get('/companion/health', (_req, res) => {
  res.json({
    ok: true,
    name: 'QuantDeskLocalCompanion',
    version: '0.1.0',
    bridgeTarget,
  });
});

app.use('/bridge', async (req, res) => {
  const target = new URL(req.originalUrl.replace(/^\/bridge\/?/, '/'), bridgeTarget.endsWith('/') ? bridgeTarget : `${bridgeTarget}/`);
  try {
    const response = await fetch(target, {
      method: req.method,
      headers: { Accept: 'application/json' },
    });
    const body = await response.text();
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    res.send(body);
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

if (!fs.existsSync(distDir)) {
  console.error(`Missing production build at ${distDir}. Run "npm run build" before starting the companion.`);
  process.exit(1);
}

app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '127.0.0.1', () => {
  console.log(`QuantDesk companion running at http://127.0.0.1:${port}`);
  console.log(`Proxying /bridge/* to ${bridgeTarget}`);
});
