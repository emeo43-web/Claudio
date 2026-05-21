export default function StatCard({ label, value, icon: Icon, color = 'blue', sub }) {
  const colors = {
    blue:    'bg-blue-600/15 text-blue-400 border-blue-600/30',
    yellow:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    purple:  'bg-purple-500/15 text-purple-400 border-purple-500/30',
    red:     'bg-red-500/15 text-red-400 border-red-500/30',
  }
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '–'}</p>
        <p className="text-sm text-slate-400">{label}</p>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
