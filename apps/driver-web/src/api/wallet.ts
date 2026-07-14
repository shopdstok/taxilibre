import api from './index'

export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: (params: { page?: number; limit?: number; type?: string }) => 
    api.get('/wallet/transactions', { params }),
  withdraw: (data: { amount: number; payment_method_id: string }) => api.post('/wallet/withdraw', data),
  addFunds: (data: { amount: number; payment_method_id: string }) => api.post('/wallet/add-funds', data),
}
