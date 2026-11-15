import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Phase 1 SQL Schema & RLS Security Audit', () => {
  const sql = fs.readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations/001_phase1_cloud_sync.sql'),
    'utf8'
  );

  it('enables RLS on every private table', () => {
    const tables = [
      'user_records',
      'attempts',
      'study_sessions',
      'review_logs',
      'admin_users',
      'user_progress_snapshots'
    ];
    for (const t of tables) {
      expect(sql).toContain(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`);
    }
  });

  it('restricts immutable event tables to SELECT and INSERT only (no UPDATE or DELETE policies)', () => {
    expect(sql).not.toMatch(/CREATE POLICY.*ON public\.attempts\s+FOR\s+(UPDATE|DELETE)/i);
    expect(sql).not.toMatch(/CREATE POLICY.*ON public\.study_sessions\s+FOR\s+(UPDATE|DELETE)/i);
    expect(sql).not.toMatch(/CREATE POLICY.*ON public\.review_logs\s+FOR\s+(UPDATE|DELETE)/i);
  });

  it('enforces server-side clock drift rejection (> 5 minutes ahead) in upsert_user_records', () => {
    expect(sql).toContain('clock_more_than_5_minutes_ahead');
    expect(sql).toContain('300000');
  });

  it('defines server-side admin_users table and keep_alive RPC', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.admin_users');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.keep_alive()');
  });
});
