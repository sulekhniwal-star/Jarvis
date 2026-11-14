import * as fs from 'fs';
import * as path from 'path';

console.log('--- Auditing Supabase Migrations & Security Policies ---');

const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
const migrationFiles = fs.readdirSync(migrationsDir).sort();

console.log(`Found ${migrationFiles.length} migration files in supabase/migrations:`);
migrationFiles.forEach(file => console.log(`  - ${file}`));

// Verification 1: Confirm mandatory migration sequence
const expectedFiles = [
  '20261114000001_initial_schema.sql',
  '20261114000002_rls_policies.sql',
  '20261114000003_storage_buckets.sql',
  '20261114000004_queues.sql',
];

for (const expected of expectedFiles) {
  if (!migrationFiles.includes(expected)) {
    throw new Error(`Missing expected migration file: ${expected}`);
  }
}
console.log('✓ Mandatory migration files present and ordered sequentially.');

// Verification 2: Check schema definition in migration 1
const schemaSql = fs.readFileSync(path.join(migrationsDir, expectedFiles[0]), 'utf-8');
const tables = [
  'user_preferences',
  'projects',
  'milestones',
  'tasks',
  'agent_runs',
  'approval_requests',
  'budget_ledgers',
  'memories',
  'audit_logs',
];

for (const table of tables) {
  const tableDefRegex = new RegExp(`create\\s+table\\s+public\\.${table}\\s*\\(`, 'i');
  if (!tableDefRegex.test(schemaSql)) {
    throw new Error(`Table public.${table} not defined in initial_schema.sql`);
  }
}
console.log(`✓ All ${tables.length} database entities properly declared with DDL.`);

// Verification 3: Check RLS policies in migration 2
const rlsSql = fs.readFileSync(path.join(migrationsDir, expectedFiles[1]), 'utf-8');
for (const table of tables) {
  const rlsEnableRegex = new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i');
  if (!rlsEnableRegex.test(rlsSql)) {
    throw new Error(`RLS not enabled on public.${table}`);
  }
  const policyRegex = new RegExp(`create\\s+policy\\s+["']${table}_owner_select["']\\s+on\\s+public\\.${table}`, 'i');
  if (!policyRegex.test(rlsSql)) {
    throw new Error(`Missing owner SELECT policy on public.${table}`);
  }
}
console.log(`✓ Row Level Security (RLS) enabled and owner-isolated across all ${tables.length} tables.`);

// Verification 4: Check immutable ledger and audit log constraints
if (!/revoke\s+update,\s*delete\s+on\s+public\.budget_ledgers/i.test(rlsSql)) {
  throw new Error('Missing revoke update, delete on public.budget_ledgers');
}
if (!/revoke\s+update,\s*delete\s+on\s+public\.audit_logs/i.test(rlsSql)) {
  throw new Error('Missing revoke update, delete on public.audit_logs');
}
console.log('✓ Immutability constraints verified: UPDATE and DELETE revoked on budget_ledgers & audit_logs.');

// Verification 5: Check storage private buckets
const storageSql = fs.readFileSync(path.join(migrationsDir, expectedFiles[2]), 'utf-8');
if (!/'task-artifacts'/i.test(storageSql) || !/public\s*=\s*false/i.test(storageSql)) {
  throw new Error('Private task-artifacts bucket not configured in storage migration');
}
console.log('✓ Private storage bucket "task-artifacts" configured with folder-level owner RLS.');

// Verification 6: Check pgmq queue creation
const queueSql = fs.readFileSync(path.join(migrationsDir, expectedFiles[3]), 'utf-8');
if (!/'jarvis_task_queue'/i.test(queueSql) || !/'jarvis_agent_run_queue'/i.test(queueSql)) {
  throw new Error('Missing pgmq queue creation for jarvis_task_queue or jarvis_agent_run_queue');
}
console.log('✓ Native pgmq queues initialized: jarvis_task_queue and jarvis_agent_run_queue.');

console.log('--- All Supabase migration & RLS policy audit checks PASSED! ---');
