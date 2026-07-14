import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '@/context/AuthContext'

export function AuthLayout() {
  const { user } = useSession()
  if (user) {
    return <Navigate to="/dashboard" replace />
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Outlet />
    </div>
  )
}
