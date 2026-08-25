# Supabase migration — what to do with these files

Phase 0 ships one SQL migration: `0001_data_bank.sql`. It creates:

- `data_bank` — single-row-per-user JSONB blob. All career data lives here.
- `templates` — uploaded LaTeX .zip metadata.
- `job_descriptions` — phase 2+, schema created now.
- `resume_versions` — phase 1+, schema created now.
- RLS policies — service_role bypasses; policies are precautionary.

## How to apply

1. Open https://ovmfuqapvjaqzwulyteq.supabase.co/project/_/sql
2. Click "New query"
3. Paste the entire contents of `0001_data_bank.sql`
4. Click "Run" (or Cmd/Ctrl+Enter)
5. Expect "Success. No rows returned" — DDL doesn't return rows

## Storage buckets (do this in the dashboard, not SQL)

Phase 0 needs two storage buckets:

- `templates` — for uploaded LaTeX .zip files (private)
- `pdfs` — for generated PDF outputs (private)

Create them at:
https://ovmfuqapvjaqzwulyteq.supabase.co/project/_/storage/buckets

For each:
- Click "New bucket"
- Name: `templates` (then repeat for `pdfs`)
- Public bucket: OFF (keep private, we generate signed urls on demand)

## Verify

After running the migration and creating buckets, query:

```sql
select tablename from pg_tables
where schemaname = 'public'
  and tablename in ('data_bank', 'templates', 'job_descriptions', 'resume_versions');
```

Should return all 4 tables.

## Why JSONB and not normalized tables

Per product.md §2.1 the data bank is form-based and the schema is the
authoritative shape (see `packages/shared/src/data-bank.ts`). Normalizing
into 6+ relational tables would mean migrations for every field added to
the data bank forms. JSONB keeps the schema in TypeScript where it
belongs, and Supabase lets us add GIN indexes on `data_bank->'personal'`
later if/when we need fast lookups.
