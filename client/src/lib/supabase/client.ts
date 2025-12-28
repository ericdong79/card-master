import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createClient() {
	const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
	const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

	return createSupabaseClient(supabaseUrl, supabaseKey);
}
