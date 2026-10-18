import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://hbxnamucmrbzcyfdxznz.supabase.co";

const supabaseKey =
  "sb_publishable_XZ30PssQbFwivSJmjWhkgg_HdXJTb-e";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);