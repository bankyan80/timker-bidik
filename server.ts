import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
dotenv.config();
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env.local') });

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const { default: app } = await import('./src/app');

const { createServer: createViteServer } = await import('vite');
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'spa',
});
app.use(vite.middlewares);
console.log('Vite middleware mounted successfully for full-stack integration.');

// Serve static files from dist (for production) or public
const getDistPath = () => {
  if (typeof __dirname !== 'undefined') return __dirname;
  return path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
};
const distPath = getDistPath();
app.use(express.static(distPath));
app.use(express.static(path.join(process.cwd(), 'public')));

// SPA fallback: return index.html for any non-API routes (Vite handles dev mode)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Not found' });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TIMKER BIDIK 360 Platform listening on http://localhost:${PORT}`);
});
