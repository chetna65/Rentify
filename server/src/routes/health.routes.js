import { Router } from 'express';
import { mysqlPool } from '../config/mysql.js';
import { getMongoDb } from '../config/mongo.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const healthRouter = Router();

healthRouter.get(
  '/health',
  asyncHandler(async (req, res) => {
    let mysqlStatus = 'down';
    try {
      const [rows] = await mysqlPool.query('SELECT 1 AS ok');
      if (rows && rows[0]?.ok === 1) {
        mysqlStatus = 'up';
      }
    } catch (err) {
      console.error('MySQL ping failed:', err.message);
    }

    let mongoStatus = 'down';
    try {
      const db = getMongoDb();
      const result = await db.command({ ping: 1 });
      if (result && result.ok === 1) {
        mongoStatus = 'up';
      }
    } catch (err) {
      console.error('MongoDB ping failed:', err.message);
    }

    const isHealthy = mysqlStatus === 'up' && mongoStatus === 'up';

    return res.status(isHealthy ? 200 : 503).json({
      mysql: mysqlStatus,
      mongo: mongoStatus,
    });
  })
);
