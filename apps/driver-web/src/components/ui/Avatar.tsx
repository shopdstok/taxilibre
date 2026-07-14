import { HTMLAttributes, ReactNode } from 'react'

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes: Record<AvatarProps['size'], string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

export const Avatar = React.forwardRef<
  HTMLDivElement,
  AvatarProps
>(({ 
  src = '', 
  alt = '', 
  name = '', 
  size = 'md', 
  className = '',
  ...props 
}, ref) => {
  const hasImage = src && src.trim() !== ''
  
  return (
    <div
      ref={ref}
      className=[
        'flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
        sizes[size],
        className,
      ].filter(Boolean).join(' ')
      {...props}
    >
      {hasImage ? (
        <img 
          src={src} 
          alt={alt} 
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground font-medium text-xs">
          {name ? name.charAt(0).toUpperCase() : '?'}
        </div>
      )}
    </div>
  )
})
Avatar.displayName = 'Avatar'
