// Creates/updates the property_details collection, its validator and indexes. Safe to re-run.
import { mongoConnect } from './lib/db.js';
import { COLLECTION, SCHEMA_VERSION, validator, indexes } from '../mongo/schema/property_details.js';

const { client, db } = await mongoConnect();
try {
  const existing = await db.listCollections({ name: COLLECTION }).toArray();
  if (existing.length === 0) {
    await db.createCollection(COLLECTION, { validator, validationLevel: 'strict', validationAction: 'error' });
    console.log(`created collection ${COLLECTION}`);
  } else {
    await db.command({ collMod: COLLECTION, validator, validationLevel: 'strict', validationAction: 'error' });
    console.log(`updated validator on ${COLLECTION}`);
  }
  await db.collection(COLLECTION).createIndexes(indexes);
  await db.collection('db_meta').updateOne(
    { _id: COLLECTION },
    { $set: { schemaVersion: SCHEMA_VERSION, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  console.log(`indexes ensured: ${indexes.map((i) => i.name).join(', ')}`);
  console.log('MongoDB initialisation complete.');
} finally {
  await client.close();
}
