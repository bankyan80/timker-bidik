// Vercel serverless function — wraps the Express app (built to dist/app.cjs)
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const appPath = join(__dirname, '..', 'dist', 'app.cjs');

let app;
if (existsSync(appPath)) {
  app = require(appPath);
} else {
  const express = require('express');
  app = express();
  app.all('*', (_req, res) => res.status(200).json({ status: 'build-in-progress' }));
}

export default app;
