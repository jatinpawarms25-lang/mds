// Live RLS Isolation Verification Script
// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... USER1_EMAIL=... USER1_PASS=... USER2_EMAIL=... USER2_PASS=... node scripts/rls_isolation_check.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const u1Email = process.env.USER1_EMAIL;
const u1Pass = process.env.USER1_PASS;
const u2Email = process.env.USER2_EMAIL;
const u2Pass = process.env.USER2_PASS;

if (!url || !anonKey || !u1Email || !u1Pass || !u2Email || !u2Pass) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_ANON_KEY, USER1_EMAIL, USER1_PASS, USER2_EMAIL, USER2_PASS');
  process.exit(1);
}

const c1 = createClient(url, anonKey);
const c2 = createClient(url, anonKey);

const { data: d1, error: e1 } = await c1.auth.signInWithPassword({ email: u1Email, password: u1Pass });
if (e1 || !d1.user) throw e1 || new Error('User 1 sign-in failed');

const { data: d2, error: e2 } = await c2.auth.signInWithPassword({ email: u2Email, password: u2Pass });
if (e2 || !d2.user) throw e2 || new Error('User 2 sign-in failed');

const testId = `rls-probe-${Date.now()}`;
const { error: upsertErr } = await c1.rpc('upsert_user_records', {
  records: [
    {
      collection: 'notes',
      id: testId,
      data: { secret: 'user1-private-data' },
      hlc: `${Date.now()}:0:probe`,
      deleted: false,
      device_id: 'probe'
    }
  ]
});
if (upsertErr) throw upsertErr;

const { data: u2Rows, error: u2Err } = await c2
  .from('user_records')
  .select('*')
  .eq('user_id', d1.user.id);

if (u2Err) throw u2Err;
if ((u2Rows || []).length !== 0) {
  console.error('RLS ISOLATION FAIL: User 2 saw rows belonging to User 1:', u2Rows);
  process.exit(1);
}

console.log('RLS ISOLATION PASS: User 2 saw 0 rows of User 1.');
