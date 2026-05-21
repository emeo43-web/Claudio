const MAP = {
  pending:   ['bg-yellow-500/20 text-yellow-300 border-yellow-500/30',  'In attesa'],
  approved:  ['bg-blue-500/20 text-blue-300 border-blue-500/30',        'Approvata'],
  rejected:  ['bg-red-500/20 text-red-300 border-red-500/30',           'Rifiutata'],
  applied:   ['bg-emerald-500/20 text-emerald-300 border-emerald-500/30','Inviata'],
  skipped:   ['bg-slate-600/40 text-slate-400 border-slate-600/30',     'Saltata'],
  sent:      ['bg-emerald-500/20 text-emerald-300 border-emerald-500/30','Inviata'],
  failed:    ['bg-red-500/20 text-red-300 border-red-500/30',           'Fallita'],
  viewed:    ['bg-sky-500/20 text-sky-300 border-sky-500/30',           'Vista'],
  interview: ['bg-purple-500/20 text-purple-300 border-purple-500/30',  'Colloquio'],
  offer:     ['bg-amber-500/20 text-amber-300 border-amber-500/30',     'Offerta!'],
}

const SOURCE_MAP = {
  linkedin: ['bg-blue-800/30 text-blue-300', 'LinkedIn'],
  adecco:   ['bg-orange-800/30 text-orange-300', 'Adecco'],
  randstad: ['bg-red-800/30 text-red-300', 'Randstad'],
  custom:   ['bg-slate-700/50 text-slate-300', 'Custom'],
}

export function StatusBadge({ status }) {
  const [cls, label] = MAP[status] ?? ['bg-slate-700 text-slate-300', status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  )
}

export function SourceBadge({ source }) {
  const [cls, label] = SOURCE_MAP[source] ?? ['bg-slate-700 text-slate-300', source]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}
