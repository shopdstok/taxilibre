import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '@/context/AuthContext'

export function ProtectedRoute() {
  const { user } = useSession()
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
