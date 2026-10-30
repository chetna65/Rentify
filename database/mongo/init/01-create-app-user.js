// Runs once, on first start of the MongoDB container (empty data volume), via mongosh.
// Creates an application user scoped to the Rentify database only: readWrite (data) + dbAdmin (collMod/indexes,
// needed so scripts/init-mongo.js can re-apply the validator). No access to other databases or admin commands.
const dbName = process.env.MONGO_DB;
const user = process.env.MONGO_APP_USER;
const pwd = process.env.MONGO_APP_PASSWORD;
if (!dbName || !user || !pwd) {
  throw new Error('MONGO_DB, MONGO_APP_USER and MONGO_APP_PASSWORD must be set');
}
db.getSiblingDB(dbName).createUser({ user, pwd, roles: [{ role: 'readWrite', db: dbName }, { role: 'dbAdmin', db: dbName }] });
print(`Created MongoDB application user '${user}' on database '${dbName}'`);
