import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://krmiuxqbkizvpdgmeeox.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtybWl1eHFia2l6dnBkZ21lZW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODMzMDQsImV4cCI6MjA5NTU1OTMwNH0.XQflxVWcrFgro-6w2b4pm_2veMM9I6s7x0k_mRA98C0'

export const supabase = createClient(supabaseUrl, supabaseKey)
