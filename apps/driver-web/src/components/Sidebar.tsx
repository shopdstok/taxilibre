import { NavLink } from 'react-router-dom'
import { Activity, AlertCircle, BarChart2, Calendar, ClipboardList, DollarSign, Home, MapPin, MessageSquare, Settings, User, Vehicle } from 'lucide-react'
import { Menu, MenuTrigger, MenuContent, MenuItem, MenuCheckboxItem, Separator } from '@/components/ui/menu'

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-background/50 backdrop-blur">
      <nav className="px-4 pt-6">
        <NavLink to="/dashboard" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-primary/10 hover:bg-primary/20">
          <Home className="h-4 w-4" />
          <span>Dashboard</span>
        </NavLink>
        
        <NavLink to="/ride-requests" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/20">
          <Activity className="h-4 w-4" />
          <span>Ride Requests</span>
        </NavLink>
        
        <NavLink to="/active-ride" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/20">
          <MapPin className="h-4 w-4" />
          <span>Active Ride</span>
        </NavLink>
        
        <NavLink to="/ride-history" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/20">
          <Clock className="h-4 w-4" />
          <span>Ride History</span>
        </NavLink>
        
        <NavLink to="/earnings" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/20">
          <DollarSign className="h-4 w-4" />
          <span>Earnings</span>
        </NavLink>
        
        <NavLink to="/wallet" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/20">
          <ClipboardList className="h-4 w-4" />
          <span>Wallet</span>
        </NavLink>
        
        <NavLink to="/vehicle" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/20">
          <Vehicle className="h-4 w-4" />
          <span>Vehicle</span>
        </NavLink>
        
        <NavLink to="/documents" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/20">
          <FileText className="h-4 w-4" />
          <span>Documents</span>
        </NavLink>
        
        <NavLink to="/notifications" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/20">
          <MessageSquare className="h-4 w-4" />
          <span>Notifications</span>
        </NavLink>
        
        <NavLink to="/messages" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/20">
          <MessageSquare className="h-4 w-4" />
          <span>Messages</span>
        </NavLink>
        
        <NavLink to="/availability" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/20">
          <AlertCircle className="h-4 w-4" />
          <span>Availability</span>
        </NavLink>
        
        <NavLink to="/settings" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/20">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </NavLink>
        
        <NavLink to="/support" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/20">
          <Activity className="h-4 w-4" />
          <span>Support</span>
        </NavLink>
      </nav>
    </aside>
  )
}
