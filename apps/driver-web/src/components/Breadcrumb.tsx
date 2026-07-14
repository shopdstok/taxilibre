import { Fragment } from 'react'
import { useLocation, NavLink } from 'react-router-dom'

export function Breadcrumb() {
  const location = useLocation()
  const pathname = location.pathname
  
  // Define breadcrumb items based on route
  const items = getBreadcrumbItems(pathname)
  
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      <ol className="flex items-center gap-2">
        {items.map((item, index) => (
          <Fragment key={item.href}>
            {index > 0 && (
              <span className="text-muted-foreground">/</span>
            )}
            {item.href === pathname ? (
              <span className="font-medium">{item.label}</span>
            ) : (
              <NavLink to={item.href} className="hover:underline">
                {item.label}
              </NavLink>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}

interface BreadcrumbItem {
  label: string
  href: string
}

function getBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  // Remove leading slash and split
  const parts = pathname.slice(1).split('/').filter(Boolean)
  
  if (parts.length === 0) {
    return [{ label: 'Dashboard', href: '/dashboard' }]
  }
  
  const items: BreadcrumbItem[] = []
  let currentPath = ''
  
  // Add dashboard as root
  items.push({ label: 'Dashboard', href: '/dashboard' })
  
  // Add each part
  for (let i = 0; i < parts.length; i++) {
    currentPath += `/${parts[i]}`
    
    // Special handling for routes with parameters
    let label = parts[i].replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())
    
    // Handle specific cases
    if (parts[i] === 'active-ride') {
      label = 'Active Ride'
    } else if (parts[i] === 'ride-history') {
      label = 'Ride History'
    } else if (parts[i] === 'vehicle-documents') {
      label = 'Vehicle Documents'
    }
    
    items.push({ label, href: currentPath })
  }
  
  return items
}
