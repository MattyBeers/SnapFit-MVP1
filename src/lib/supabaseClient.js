// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Quick, safe debug output (do NOT print secrets)
console.log('Supabase envs available:', {
  urlPresent: Boolean(supabaseUrl),
  anonKeyPresent: Boolean(supabaseAnonKey),
});

// Only create client if valid credentials exist
const isValidUrl = supabaseUrl && supabaseUrl.startsWith("https://") && supabaseUrl.includes("supabase.co");
const hasKey = supabaseAnonKey && supabaseAnonKey.length > 10;

export const supabase = isValidUrl && hasKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
