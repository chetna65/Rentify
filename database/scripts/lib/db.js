import fs from 'node:fs';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

process.on('uncaughtException', (e) => {
  console.error(`ERROR: ${String(e.message).slice(0, 400)}`);
  process.exit(1);
});

const need = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. Copy .env.example to .env first.`);
  return v;
};

const resolveSslCa = (caValue) => {
  if (!caValue) return undefined;
  const trimmed = caValue.trim();
  if (trimmed.includes('-----BEGIN CERTIFICATE-----')) {
    return trimmed;
  }
  try {
    if (fs.existsSync(trimmed)) {
      return fs.readFileSync(trimmed, 'utf8');
    }
  } catch {
    // If not a readable file path, return trimmed as fallback
  }
  return trimmed;
};

export const mysqlConnect = (extra = {}) => {
  const isSsl = process.env.MYSQL_SSL === 'true';
  let ssl;
  if (isSsl) {
    ssl = { rejectUnauthorized: true };
    if (process.env.MYSQL_SSL_CA) {
      const ca = resolveSslCa(process.env.MYSQL_SSL_CA);
      if (ca) ssl.ca = ca;
    }
  }

  return mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    database: need('MYSQL_DATABASE'),
    user: need('MYSQL_USER'),
    password: need('MYSQL_PASSWORD'),
    timezone: 'Z',
    charset: 'utf8mb4',
    ...(ssl ? { ssl } : {}),
    ...extra,
  });
};

export const mongoConnect = async () => {
  const dbName = need('MONGO_DB');
  let uri = process.env.MONGO_URI;
  if (!uri) {
    const host = process.env.MONGO_HOST || '127.0.0.1';
    const port = process.env.MONGO_PORT || '27017';
    const user = encodeURIComponent(need('MONGO_APP_USER'));
    const pass = encodeURIComponent(need('MONGO_APP_PASSWORD'));
    uri = `mongodb://${user}:${pass}@${host}:${port}/${dbName}?authSource=${dbName}`;
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  return { client, db: client.db(dbName) };
};
