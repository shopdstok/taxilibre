import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toast } from '@/components/ui/Toast'
import { DriverLayout } from '@/layouts/DriverLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { routes } from '@/routes/index'

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DriverLayout>
          {routes}
        </DriverLayout>
      </BrowserRouter>
      <Toast />
    </QueryClientProvider>
  )
}
