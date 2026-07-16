import { Search } from 'lucide-react'
import { useSession } from '@/context/AuthContext'
import { Bell, Moon, Sun } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import DropdownMenu from '@/components/ui/DropdownMenu'

export function Header() {
  const { user } = useSession()
  
  if (!user) {
    return null
  }
  
  return (
    <header className="flex h-16 items-center justify-between px-6 border-b border-bg/50">
      <div className="flex items-center gap-4">
        <button className="btn-sm ml-auto lg:hidden" aria-label="Open sidebar">
          <Menu className="h-4 w-4" />
        </button>
        
        <h1 className="text-xl font-semibold hidden lg:block">Taxilibre Driver</h1>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        
        {/* Notifications */}
        <div className="relative">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              3
            </span>
          </Button>
        </div>
        
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <Sun className="h-4 w-4" />
        </Button>
        
        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open user menu">
              <Avatar src={user.avatar_url || ''} alt={user.name || 'User'} name={user.name?.split(' ')[0] || 'U'} className="h-8 w-8" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem>
              <div className="flex items-center gap-3">
                <Avatar src={user.avatar_url || ''} alt={user.name || 'User'} name={user.name?.split(' ')[0] || 'U'} className="h-8 w-8" />
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Wallet className="mr-2 h-4 w-4" /> Wallet
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
