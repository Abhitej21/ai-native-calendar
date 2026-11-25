import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);

// Production: serve Vite build from ../client/dist
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`Pulse API listening on http://localhost:${PORT}`);
});
