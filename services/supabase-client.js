import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://<YOUR_SUPABASE_PROJECT>.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth service
export const authService = {
  async signUp(email, password, userData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Database service
export const dbService = {
  // Users
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  },

  async updateUserProfile(userId, userData) {
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', userId)
      .select()
    return { data, error }
  },

  // Rides
  async createRide(rideData) {
    const { data, error } = await supabase
      .from('rides')
      .insert([rideData])
      .select()
    return { data, error }
  },

  async getUserRides(userId) {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getAvailableRides() {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async updateRideStatus(rideId, status, driverId = null) {
    const updateData = { status }
    if (driverId) updateData.driver_id = driverId
    
    const { data, error } = await supabase
      .from('rides')
      .update(updateData)
      .eq('id', rideId)
      .select()
    return { data, error }
  },

  // Drivers
  async getDriverProfile(userId) {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', userId)
      .single()
    return { data, error }
  },

  async updateDriverProfile(userId, driverData) {
    const { data, error } = await supabase
      .from('drivers')
      .update(driverData)
      .eq('user_id', userId)
      .select()
    return { data, error }
  },

  async updateDriverAvailability(userId, isAvailable) {
    const { data, error } = await supabase
      .from('drivers')
      .update({ is_available: isAvailable })
      .eq('user_id', userId)
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

  subscribeToDriverStatus(callback) {
    return supabase
      .channel('drivers')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'drivers' },
        callback
      )
      .subscribe()
  }
}

export default supabase
