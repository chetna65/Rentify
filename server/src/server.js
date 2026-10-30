import { app } from './app.js';
import { env } from './config/env.js';
import { mysqlPool, closeMySQLPool } from './config/mysql.js';
import { connectMongo, closeMongo } from './config/mongo.js';
import { UPLOADS_DIR } from './services/storage.service.js';

let server;

async function startServer() {
  try {
    // 1. Verify MySQL connection
    const conn = await mysqlPool.getConnection();
    conn.release();
    console.log('✓ MySQL 8 connected and pool ready');

    // 2. Verify MongoDB connection
    await connectMongo();
    console.log('✓ MongoDB 8 connected');

    // Ephemeral disk warning in production
    if (env.NODE_ENV === 'production') {
      console.warn(
        `⚠️  WARNING: Uploaded documents are saved on local disk at "${UPLOADS_DIR}". ` +
        `This disk is EPHEMERAL on containerized/cloud hosting platforms and will be lost across redeployments or restarts. ` +
        `Mount a persistent disk volume or configure cloud object storage (e.g. S3/GCS) for production.`
      );
    }

    // 3. Start listening
    server = app.listen(env.PORT, () => {
      console.log(`✓ Rentify API Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
      console.log(`  Healthcheck endpoint: http://localhost:${env.PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start Rentify Server:', error);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`\n${signal} received. Initiating graceful shutdown...`);

  if (server) {
    server.close(() => {
      console.log('HTTP listener stopped');
    });
  }

  try {
    await closeMySQLPool();
    console.log('MySQL connection pool closed');
  } catch (err) {
    console.error('Error closing MySQL pool:', err.message);
  }

  try {
    await closeMongo();
    console.log('MongoDB client connection closed');
  } catch (err) {
    console.error('Error closing MongoDB client:', err.message);
  }

  console.log('Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();
