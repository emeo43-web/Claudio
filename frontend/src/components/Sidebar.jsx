import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, Send, User, Settings, Zap,
} from 'lucide-react'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jobs', icon: Briefcase, label: 'Offerte' },
  { to: '/applications', icon: Send, label: 'Candidature' },
  { to: '/profile', icon: User, label: 'Profilo' },
  { to: '/settings', icon: Settings, label: 'Impostazioni' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">Claudio</p>
            <p className="text-xs text-slate-500 mt-0.5">Job Automator</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-800">
        <p className="text-xs text-slate-600">v1.0 · Powered by Claude</p>
      </div>
    </aside>
  )
}
