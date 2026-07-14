import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://<YOUR_SUPABASE_PROJECT>.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database service functions
export const supabaseService = {
  // Users
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
    return { data, error }
  },

  async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
    return { data, error }
  },

  async updateUser(id, userData) {
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
    return { data, error }
  },

  // Rides
  async getRides() {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
    return { data, error }
  },

  async createRide(rideData) {
    const { data, error } = await supabase
      .from('rides')
      .insert([rideData])
      .select()
    return { data, error }
  },

  async updateRide(id, rideData) {
    const { data, error } = await supabase
      .from('rides')
      .update(rideData)
      .eq('id', id)
      .select()
    return { data, error }
  },

  // Drivers
  async getDrivers() {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
    return { data, error }
  },

  async createDriver(driverData) {
    const { data, error } = await supabase
      .from('drivers')
      .insert([driverData])
      .select()
    return { data, error }
  },

  // Real-time subscriptions
  subscribeToRides(callback) {
    return supabase
      .channel('rides')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rides' },
        callback
      )
      .subscribe()
  },

  subscribeToUsers(callback) {
    return supabase
      .channel('users')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' },
        callback
      )
      .subscribe()
  }
}

export default supabase
