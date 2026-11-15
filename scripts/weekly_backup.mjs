import fs from 'node:fs';
import path from 'node:path';

const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !serviceKey) {
  console.log('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured. Skipping backup.');
  process.exit(0);
}

const tables = ['user_records', 'attempts', 'study_sessions', 'review_logs', 'user_snapshots'];
const backup = {
  exportedAt: new Date().toISOString(),
  schemaVersion: 1,
  tables: {}
};

for (const table of tables) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to export ${table}: HTTP ${res.status}`);
  }
  backup.tables[table] = await res.json();
}

const outDir = path.join(process.cwd(), 'backups');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `mds_os_cloud_backup_${new Date().toISOString().slice(0, 10)}.json`);
fs.writeFileSync(outFile, JSON.stringify(backup, null, 2), 'utf8');
console.log(`Backup written to ${outFile}`);
