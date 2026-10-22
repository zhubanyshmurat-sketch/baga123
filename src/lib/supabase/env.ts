// NEXT_PUBLIC_* variables are inlined at build time, so each must be referenced literally.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseEnv =
  url && key && url.startsWith("http") ? { url, key } : null;

/** True when a Supabase project is configured. Without it the site runs in demo mode. */
export const isSupabaseConfigured = supabaseEnv !== null;
