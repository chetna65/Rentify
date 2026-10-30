import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.routes.js';
import { listingRouter } from './routes/listing.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { vendorRouter } from './routes/vendor.routes.js';
import adminRouter from './routes/admin.routes.js';
import partnerRouter from './routes/partner.routes.js';
import savedRouter from './routes/saved.routes.js';
import assistanceRouter from './routes/assistance.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security headers
app.use(helmet());

// CORS configuration supporting credentials
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Body parsing with limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Cookie parsing
app.use(cookieParser());

// Root API router
const apiRouter = express.Router();
apiRouter.use(healthRouter);
apiRouter.use(listingRouter);
apiRouter.use(authRouter);
apiRouter.use(vendorRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/partner', partnerRouter);
apiRouter.use('/me', savedRouter);
apiRouter.use('/assistance', assistanceRouter);

app.use('/api', apiRouter);

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  });
});

// Central error handler
app.use(errorHandler);
