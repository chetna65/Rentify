# Rentify – database setup (MySQL 8 + MongoDB)

Databases only: **no API, no Express server, no authentication, no frontend changes** in this phase.
All commands run from this `database/` folder. Requires Docker (with Compose v2) and Node.js ≥ 20.6.

## Quick start

```bash
cd database
cp .env.example .env        # then edit .env: change every password
npm install                 # installs mysql2 + mongodb only
npm run db:up               # start MySQL 8.0 and MongoDB 8.0 (waits until healthy)
npm run db:setup            # = db:migrate + db:mongo:init + db:seed + db:verify
```

A successful run ends with `VERIFY PASSED`. Each step can also run alone:

| Command | What it does |
|---|---|
| `npm run db:migrate` | Applies `mysql/migrations/*.sql` in order (checksummed; re-runnable) |
| `npm run db:mongo:init` | Creates `property_details` with validator + indexes (re-runnable) |
| `npm run db:seed` | Inserts missing reference + synthetic records, never overwrites (re-runnable) |
| `npm run db:seed:reference` | Cities only (Nagpur, Pune), no synthetic data |
| `npm run db:verify` | Structure, cross-database consistency, constraint probes (rolled back); non-zero exit on failure |
| `npm run db:down` | Stop containers (data kept). Full wipe: `docker compose down -v` |

If the Mongo volume already existed before you created `.env`, its app user was not created: run `docker compose down -v` and start again.

## Who owns what

Shared identity: **`listings.id` (UUID, MySQL) = `_id` in MongoDB `property_details`.**

| MySQL (authoritative) | MongoDB (flexible content) |
|---|---|
| users, roles, sessions, partner profiles | description |
| listing owner, city, locality, title, type, rent, deposit | amenities (category, name, distance) |
| verification status, seal, flag reason | images (URL or storage key) |
| document metadata (hash, type, storage key, last 4 chars of number) | safety score/note, tags, free-form `attributes` |
| partner assignments, field audits, feedback, audit log | `metadata.isSynthetic` / `dataSource` |

Rules enforced in the databases themselves: status transitions (`pending → in-review | verified | flagged`, `in-review → verified | flagged`, `verified → flagged`, `flagged → pending`), one active partner assignment per listing, role-pinned foreign keys (only vendors own listings, only partners are assigned, only customers leave feedback), one review per user per listing, append-only `audit_logs`, and a Mongo validator that rejects core fields such as `status` or `rent`. MongoDB is never the source of truth: if the two disagree, MySQL wins and `db:verify` reports the drift.

## Synthetic data

Every seeded record other than the two cities is **synthetic**: `is_synthetic=1`, `data_source='synthetic_seed_v1'` (MySQL, enforced by CHECK constraints) and `metadata.isSynthetic=true` (MongoDB). It is derived from the prototype's mock files in `../src/data/`, which the seed reads directly. Names, listings and notes are fictional; phone numbers are non-routable placeholders (`+91 0000000xxx`) and emails use `@example.test`. Photos are demo placeholders hot-linked from Unsplash and marked `demo_placeholder`. **No real dataset has been imported:** before importing real Nagpur/Pune records, confirm their provenance, coverage and licence. Document "verification" in this data is prototype text; no registry (IGR/Mahabhulekh), UIDAI or fraud-detection integration exists.

| Role | Name | Placeholder phone |
|---|---|---|
| customer | Aarav Sharma | +910000000001 |
| vendor | Rajesh M. Sharma | +910000000002 |
| admin | Arvind Mehta | +910000000003 |
| partner | Amit Patil (Nagpur) | +910000000004 |
| partner | Pooja Kulkarni (Pune) | +910000000005 |

## Security notes

- Local development only. Ports bind to `127.0.0.1`; `.env` is git-ignored; no secrets are committed.
- Documents: only metadata is stored. `storage_key` must be a relative key in private storage (CHECK rejects URLs and absolute paths). Full document numbers are not stored; Aadhaar is never stored in full.
- The Mongo app user is limited to the `rentify` database (`readWrite` + `dbAdmin`). The MySQL app user owns only the `rentify` schema.
- The compose file sets `--log-bin-trust-function-creators=1` so the non-root MySQL user can create triggers. On managed MySQL, set the equivalent or run migrations with a privileged account.

## Layout

```
database/
  docker-compose.yml  .env.example  package.json
  mysql/migrations/   001 cities/users/sessions · 002 listings · 003 documents/assignments/audits · 004 feedback/audit log
  mongo/schema/       property_details validator + indexes
  mongo/init/         container-start script that creates the Mongo app user
  scripts/            migrate.js · init-mongo.js · seed.js · verify.js
```
