const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://<YOUR_SUPABASE_PROJECT>.supabase.co'
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create Supabase client (public key - for user operations)
const supabase = createClient(supabaseUrl, supabaseKey)

// Create admin client (service role key - for admin operations)
const supabaseAdmin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : supabase

/**
 * Test Supabase connection
 */
const testConnection = async () => {
  try {
    const { data, error } = await supabaseAdmin.from('users').select('count').limit(1)

    if (error) {
      return false
    }

    return true
  } catch (error) {
    return false
  }
}

/**
 * Get all users from Supabase
 */
const getUsers = async () => {
  try {
    const { data, error } = await supabaseAdmin.from('users').select('*')

    if (error) {
      return null
    }

    return data
  } catch (error) {
    return null
  }
}

/**
 * Create user in Supabase (using admin client to bypass RLS)
 */
const createUser = async (userData) => {
  try {
    const { data, error } = await supabaseAdmin.from('users').insert(userData).select()

    if (error) {
      return null
    }

    return data[0]
  } catch (error) {
    return null
  }
}

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  getUsers,
  createUser
}
