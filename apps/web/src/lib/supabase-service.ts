/**
 * Service-role Supabase client. Server-only. NEVER expose to the browser.
 * Use this for trusted server-side operations: storage uploads, full-table
 * reads, migrations.
 */
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
