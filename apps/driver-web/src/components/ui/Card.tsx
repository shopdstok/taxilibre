import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export const Card = React.forwardRef<
  HTMLDivElement,
  CardProps
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className=[
        'rounded-lg border border-bg background/50 bg-background/50 px-6 pt-5 pb-4',
        className,
      ].filter(Boolean).join(' ')
      {...props}
    />
  )
})
Card.displayName = 'Card'
