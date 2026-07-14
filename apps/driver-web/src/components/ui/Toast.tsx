import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

interface ToastProps {
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
}

interface ToastContainerProps {
  className?: string
}

export const Toast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const addToast = (toast: Omit<ToastProps, 'variant'> & { variant?: ToastProps['variant'] }) => {
    setToasts(prev => [...prev, { ...toast, variant: toast.variant ?? 'default' }])
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter((_, index) => index !== 0))
    }, 5000)
  }

  // Expose a way to add toast from outside
  // In a real app, you'd use a context or zustand store
  ;(window as any).showToast = addToast

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse space-y-4 sm:bottom-6 sm:right-6">
      {toasts.map((toast, index) => (
        <div key={index} className="w-full max-w-xs">
          <div className={`flex w-full items-start rounded-lg border p-4 ${getVariantClass(toast.variant ?? 'default')}`}>
            <div className="flex flex-col">
              <h3 className="sr-only">Toast notification</h3>
              <div className="text-sm font-medium">{toast.title}</div>
              {toast.description && (
                <div className="text-sm text-muted-foreground mt-1">{toast.description}</div>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setToasts(prev => prev.filter((_, i) => i !== index))}
              className="ml-auto h-4 w-4 flex shrink-0 items-center justify-center rounded"
            >
              ×
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function getVariantClass(variant: string): string {
  switch (variant) {
    case 'destructive':
      return 'bg-destructive text-destructive-foreground'
    case 'success':
      return 'bg-success text-success-foreground'
    default:
      return 'bg-primary text-primary-foreground'
  }
}

Toast.displayName = 'Toast'
