// Applies mysql/migrations/*.sql in order. Safe to re-run: applied files are skipped, and an applied file
// whose contents changed is an error (add a new migration instead of editing an old one).
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mysqlConnect } from './lib/db.js';

const dir = new URL('../mysql/migrations/', import.meta.url);
const files = readdirSync(dir).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();

const conn = await mysqlConnect({ multipleStatements: true });
let applied = 0;
try {
  const [[lock]] = await conn.query("SELECT GET_LOCK('rentify_migrate', 30) AS got");
  if (lock.got !== 1) throw new Error('Could not acquire migration lock');

  await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(190) NOT NULL PRIMARY KEY,
    checksum CHAR(64) NOT NULL,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB`);
  const [rows] = await conn.query('SELECT filename, checksum FROM schema_migrations');
  const done = new Map(rows.map((r) => [r.filename, r.checksum]));

  for (const file of files) {
    const sql = readFileSync(new URL(file, dir), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    if (done.has(file)) {
      if (done.get(file) !== checksum) throw new Error(`Migration ${file} was modified after being applied`);
      console.log(`skip   ${file}`);
      continue;
    }
    await conn.query(sql); // DDL auto-commits, so a failed file must be fixed/cleaned manually
    await conn.query('INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)', [file, checksum]);
    console.log(`apply  ${file}`);
    applied++;
  }
  console.log(`MySQL migrations complete (${applied} applied, ${files.length - applied} already present).`);
} finally {
  await conn.query("SELECT RELEASE_LOCK('rentify_migrate')").catch(() => {});
  await conn.end();
}
