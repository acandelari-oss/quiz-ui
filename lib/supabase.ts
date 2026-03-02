import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nmvkfuowjfwkowtlaxol.supabase.co";

const supabaseAnonKey = "sb_publishable_Nq0curHMGWljcLCW6PbmHw_HkT32gJh";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);