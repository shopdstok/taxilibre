import { Outlet, Navigate } from 'react-router-dom'
import { useSession } from '@/context/AuthContext'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { Breadcrumb } from '@/components/Breadcrumb'

export function DriverLayout() {
  const { user } = useSession()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          <Breadcrumb />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
