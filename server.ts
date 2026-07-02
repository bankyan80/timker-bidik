import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const { default: app } = await import('./src/app');

const { createServer: createViteServer } = await import('vite');
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'spa',
});
app.use(vite.middlewares);
console.log('Vite middleware mounted successfully for full-stack integration.');

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TIMKER BIDIK 360 Platform listening on http://localhost:${PORT}`);
});
