// Vercel serverless function — wraps the Express app (built to dist/app.cjs)
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const appPath = join(__dirname, '..', 'dist', 'app.cjs');

let app;
if (existsSync(appPath)) {
  try {
    // dist/app.cjs exports { default: ExpressApp } via esbuild's __toCommonJS
    const mod = require(appPath);
    app = mod.default || mod;
  } catch (err) {
    const express = require('express');
    app = express();
    app.all('*', (_req, res) => res.status(500).json({ error: 'App load failed', detail: err.message }));
  }
} else {
  const express = require('express');
  app = express();
  app.all('*', (_req, res) => res.status(200).json({ status: 'build-in-progress' }));
}

export default app;
