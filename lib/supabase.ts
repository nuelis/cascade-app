import { createClient } from "@supabase/supabase-js";

// Browser client — safe to use in client components. Respects RLS.
export const supabaseBrowser = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// Server client — uses the service role key, bypasses RLS.
// ONLY use this inside API routes / server code, never expose to the client.
export const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
