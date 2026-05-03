import { createClient } from "@supabase/supabase-js";

import { projectId, publicAnonKey } from "../../utils/supabase/info";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "") ||
  process.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "") ||
  `https://${projectId}.supabase.co`;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  publicAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
