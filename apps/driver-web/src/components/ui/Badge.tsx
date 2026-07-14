import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

const variants: Record<BadgeProps['variant'], string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  outline: 'border border-input',
}

export const Badge = React.forwardRef<
  HTMLDivElement,
  BadgeProps
>(({ className, variant = 'default', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className=[
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className,
      ].filter(Boolean).join(' ')
      {...props}
    />
  )
})
Badge.displayName = 'Badge'
