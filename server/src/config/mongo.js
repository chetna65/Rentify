import { MongoClient } from 'mongodb';
import { env } from './env.js';

let mongoUri;
if (env.MONGO_URI) {
  mongoUri = env.MONGO_URI;
} else {
  const encodedUser = encodeURIComponent(env.MONGO_APP_USER);
  const encodedPassword = encodeURIComponent(env.MONGO_APP_PASSWORD);
  mongoUri = `mongodb://${encodedUser}:${encodedPassword}@${env.MONGO_HOST}:${env.MONGO_PORT}/${env.MONGO_DB}?authSource=${env.MONGO_DB}`;
}

export const mongoClient = new MongoClient(mongoUri, {
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 20,
});

let dbInstance = null;

export async function connectMongo() {
  if (!dbInstance) {
    await mongoClient.connect();
    dbInstance = mongoClient.db(env.MONGO_DB);
  }
  return dbInstance;
}

export function getMongoDb() {
  if (!dbInstance) {
    dbInstance = mongoClient.db(env.MONGO_DB);
  }
  return dbInstance;
}

/**
 * Accessor for the property_details MongoDB collection.
 * @returns {import('mongodb').Collection}
 */
export function getPropertyDetails() {
  return getMongoDb().collection('property_details');
}

export async function closeMongo() {
  await mongoClient.close();
  dbInstance = null;
}
