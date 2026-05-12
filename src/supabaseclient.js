import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ypwqcstsvqowawhzvsbu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd3Fjc3RzdnFvd2F3aHp2c2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTA0MTQsImV4cCI6MjA5NDEyNjQxNH0.A_gdD3sfRbLzp8ZZ1DiQdNRClcC1FnpmptOkE8_Hz04";

export const supabase = createClient(supabaseUrl, supabaseKey);