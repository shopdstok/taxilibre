import api from './index'

export const driverAPI = {
  getProfile: () => api.get('/drivers/me'),
  updateProfile: (data: { 
    first_name?: string; 
    last_name?: string; 
    phone?: string; 
    license_number?: string; 
    license_expiry_date?: string; 
  }) => api.put('/drivers/me', data),
  getStatus: () => api.get('/drivers/status'),
  setStatus: (data: { is_online: boolean }) => api.patch('/drivers/status', data),
  getVehicle: () => api.get('/drivers/vehicle'),
  updateVehicle: (data: { 
    make?: string; 
    model?: string; 
    year?: number; 
    license_plate?: string; 
    color?: string; 
  }) => api.put('/drivers/vehicle', data),
}
