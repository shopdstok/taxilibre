// Supabase Configuration
export const supabaseConfig = {
  url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://<YOUR_SUPABASE_PROJECT>.supabase.co',
  anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE',
  database: {
    host: process.env.SUPABASE_DB_HOST || '<YOUR_SUPABASE_HOST>.supabase.co',
    port: parseInt(process.env.SUPABASE_DB_PORT, 10) || 5432,
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    user: process.env.SUPABASE_DB_USER || 'postgres',
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:[YOUR-PASSWORD]@<YOUR_SUPABASE_HOST>.supabase.co:5432/postgres'
  }
}

// Environment variables for Vercel
export const envVars = {
  NEXT_PUBLIC_SUPABASE_URL: supabaseConfig.url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseConfig.anonKey,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE',
  DATABASE_URL: supabaseConfig.database.connectionString
}
