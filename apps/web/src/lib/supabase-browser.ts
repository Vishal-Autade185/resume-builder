/**
 * Browser-side Supabase client. Used by client components for reads from
 * anon-safe tables. Phase 0 doesn't expose the anon key to the browser (we
 * use server actions / route handlers for everything); this client is here
 * for future phases that may want realtime updates.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
