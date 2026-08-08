// ---------------- config ----------------
// Replace with your own project's values (Settings > API in the Supabase dashboard).
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";

// Shared Supabase client, used for both the edge function calls and auth
// (relies on the supabase-js UMD build loaded in index.html before this file).
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
