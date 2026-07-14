import api from './index'

export const ridesAPI = {
  getRideRequests: (params: { page?: number; limit?: number; status?: string }) => 
    api.get('/rides/requests', { params }),
  acceptRide: (rideId: string) => api.post(`/rides/${rideId}/accept`),
  startRide: (rideId: string, data: { start_latitude: number; start_longitude: number }) => 
    api.post(`/rides/${rideId}/start`, data),
  endRide: (rideId: string, data: { end_latitude: number; end_longitude: number; fare: number }) => 
    api.post(`/rides/${rideId}/end`, data),
  cancelRide: (rideId: string, reason: string) => api.post(`/rides/${rideId}/cancel`, { reason }),
  getActiveRide: () => api.get('/rides/active'),
  getRideHistory: (params: { page?: number; limit?: number }) => 
    api.get('/rides/history', { params }),
  getRideDetails: (rideId: string) => api.get(`/rides/${rideId}`),
  // For passenger-to-driver communication
  sendMessage: (rideId: string, content: string) => api.post(`/rides/${rideId}/messages`, { content }),
  getMessages: (rideId: string) => api.get(`/rides/${rideId}/messages`),
}
