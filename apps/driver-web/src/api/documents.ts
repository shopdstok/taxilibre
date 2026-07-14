import api from './index'

export const documentsAPI = {
  getDriverDocuments: () => api.get('/documents/driver'),
  uploadDocument: (data: { document_type: string; file: File }) => {
    const formData = new FormData()
    formData.append('document_type', data.document_type)
    formData.append('file', data.file)
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getVehicleDocuments: () => api.get('/documents/vehicle'),
  uploadVehicleDocument: (data: { document_type: string; file: File }) => {
    const formData = new FormData()
    formData.append('document_type', data.document_type)
    formData.append('file', data.file)
    return api.post('/documents/upload-vehicle', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
