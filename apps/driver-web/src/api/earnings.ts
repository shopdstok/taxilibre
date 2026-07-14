import api from './index'

export const earningsAPI = {
  getTodayEarnings: () => api.get('/earnings/today'),
  getWeeklyEarnings: () => api.get('/earnings/weekly'),
  getMonthlyEarnings: () => api.get('/earnings/monthly'),
  getSummary: () => api.get('/earnings/summary'),
}
