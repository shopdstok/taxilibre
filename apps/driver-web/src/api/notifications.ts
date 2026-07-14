import api from './index'

export const notificationsAPI = {
  getNotifications: (params: { page?: number; limit?: number; unread?: boolean }) => 
    api.get('/notifications', { params }),
  markAsRead: (notificationId: string) => api.patch(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  deleteNotification: (notificationId: string) => api.delete(`/notifications/${notificationId}`),
}
