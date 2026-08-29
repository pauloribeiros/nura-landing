/**
 * Applies one .sql migration file and prints the resulting grants.
 *
 * Migrations run DDL, so this uses DIRECT_URL (session pooler, 5432) like
 * drizzle.config.ts does. The connection string is read from the env file and
 * never printed.
 *
 *   node apply-migration.mjs migrations/0009_iq_server_writes.sql
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

const arquivo = process.argv[2];
if (!arquivo) throw new Error('uso: node apply-migration.mjs <arquivo.sql>');

const env = readFileSync('../../apps/web/.env.local', 'utf8');
const ler = (chave) =>
  (env.match(new RegExp('^' + chave + '=(.*)$', 'm')) ?? [])[1]?.trim().replace(/^["']|["']$/g, '');

const url = ler('DIRECT_URL') || ler('DATABASE_URL');
if (!url) throw new Error('DIRECT_URL ou DATABASE_URL ausente em apps/web/.env.local');

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

await client.query(readFileSync(arquivo, 'utf8'));

const { rows } = await client.query(`
  select table_name, string_agg(distinct privilege_type, ', ' order by privilege_type) as privilegios
  from information_schema.role_table_grants
  where grantee = 'service_role' and table_name like 'assessment%'
  group by table_name
  order by table_name`);

for (const linha of rows) console.log(linha.table_name.padEnd(22), linha.privilegios);
await client.end();
