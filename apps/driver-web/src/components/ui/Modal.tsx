import { HTMLAttributes, ReactNode } from 'react'

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  className?: string
}

export const Modal = React.forwardRef<
  HTMLDivElement,
  ModalProps
>(({ 
  open, 
  onOpenChange, 
  children, 
  className = '',
  ...props 
}, ref) => {
  return (
    <>
      {open && (
        <div
          ref={ref}
          className=[
            'fixed inset-0 z-50 flex items-end justify-center px-4 py-6 sm:items-center sm:jsutify-center',
            className,
          ].filter(Boolean).join(' ')
          onClick={onOpenChange}
          {...props}
        >
          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-lg max-h-[90vh] overflow-hidden bg-background border border-bg/50 shadow-xl">
            <div className="flex h-full w-full flex-col">
              <div className="flex-1 overflow-y-auto">{children}</div>
            </div>
          </div>
        </div>
      )}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onOpenChange} style={{ display: open ? 'block' : 'none' }}></div>
    </>
  )
})
Modal.displayName = 'Modal'
