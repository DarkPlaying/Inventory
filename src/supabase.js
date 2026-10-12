import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fjsqkyapsbdwxkvsstgm.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1YvgGKxOSf4LfRdzktOamg_xP93FKqf'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabaselink = supabase
export default supabase