import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDatabase } from './config/db';
import { ensureSeeded } from './services/demoScenarioSeeder';
import { apiRouter } from './routes/apiRoutes';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Rate limiting for API protection
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Udyam One Enterprise Backend',
    referenceDate: process.env.DATASET_REFERENCE_DATE || '2026-07-15',
  });
});

app.use('/api', apiRouter);

const PORT = Number(process.env.PORT || 5000);

if (require.main === module) {
  (async () => {
    try {
      await connectDatabase();
      await ensureSeeded();
      app.listen(PORT, () => {
        console.log(`[Server] Udyam One Backend listening on http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error('[Server] Startup error:', err);
      process.exit(1);
    }
  })();
}
