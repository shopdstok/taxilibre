import { HTMLAttributes } from 'react'

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(({
  src = '',
  alt = '',
  name = '',
  size = 'md',
  className = '',
  ...props
}, ref) => {
  return <div ref={ref} {...props} />
})
Avatar.displayName = 'Avatar'
