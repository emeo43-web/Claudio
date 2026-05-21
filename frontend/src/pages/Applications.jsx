import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { ExternalLink, Eye } from 'lucide-react'
import { StatusBadge, SourceBadge } from '../components/StatusBadge'
import StatCard from '../components/StatCard'
import { getApplications, updateApplication, getStats } from '../api'
import { Send, Trophy, Clock, XCircle } from 'lucide-react'

const APPLICATION_STATUSES = [
  { value: 'sent', label: 'Inviata' },
  { value: 'viewed', label: 'Vista' },
  { value: 'interview', label: 'Colloquio' },
  { value: 'rejected', label: 'Rifiutata' },
  { value: 'offer', label: 'Offerta!' },
  { value: 'failed', label: 'Fallita' },
]

function CVModal({ app, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="font-semibold text-white">{app.job?.title}</h3>
            <p className="text-slate-400 text-sm">{app.job?.company}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {app.cover_letter && (
            <div>
              <h4 className="label">Lettera di presentazione</h4>
              <div className="bg-slate-800 rounded-lg p-4 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {app.cover_letter}
              </div>
            </div>
          )}
          {app.cv_html && (
            <div>
              <h4 className="label">CV</h4>
              <iframe
                srcDoc={app.cv_html}
                className="w-full h-[500px] rounded-lg border border-slate-700 bg-white"
                title="CV"
              />
            </div>
          )}
        </div>
        {app.cv_html && (
          <div className="p-5 border-t border-slate-800">
            <button
              onClick={() => { const w = window.open('', '_blank'); w.document.write(app.cv_html); w.document.close(); w.print() }}
              className="btn-ghost"
            >
              Stampa / Salva PDF
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Applications() {
  const [selectedApp, setSelectedApp] = useState(null)
  const qc = useQueryClient()

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: getApplications,
  })
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats })

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => updateApplication(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Stato aggiornato')
    },
  })

  const fmt = (d) => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="p-6 space-y-6">
      {selectedApp && <CVModal app={selectedApp} onClose={() => setSelectedApp(null)} />}

      <h1 className="text-2xl font-bold text-white">Candidature</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Totale inviate" value={stats?.applications_sent} icon={Send} color="blue" />
        <StatCard label="Colloqui" value={stats?.interviews} icon={Clock} color="purple" />
        <StatCard label="Offerte" value={stats?.offers} icon={Trophy} color="emerald" />
        <StatCard
          label="Rifiutate"
          value={stats?.by_application_status?.rejected ?? 0}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="card text-center py-10 text-slate-500">Caricamento...</div>
      ) : apps.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">
          <p className="text-3xl mb-3">📭</p>
          <p>Nessuna candidatura inviata ancora.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Data', 'Ruolo', 'Azienda', 'Fonte', 'Stato', 'Note', 'CV', 'Link'].map(h => (
                  <th key={h} className="text-left text-xs text-slate-500 uppercase tracking-wider px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apps.map(app => (
                <tr key={app.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmt(app.applied_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white text-xs line-clamp-1">{app.job?.title ?? '–'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{app.job?.company ?? '–'}</td>
                  <td className="px-4 py-3">
                    {app.job?.source && <SourceBadge source={app.job.source} />}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={app.status}
                      onChange={e => updateMut.mutate({ id: app.id, status: e.target.value })}
                      className="bg-slate-800 border border-slate-700 text-xs rounded px-2 py-1 text-slate-200 focus:outline-none"
                    >
                      {APPLICATION_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      defaultValue={app.notes ?? ''}
                      placeholder="Note..."
                      className="bg-transparent text-xs text-slate-400 focus:outline-none w-24"
                      onBlur={e => {
                        if (e.target.value !== (app.notes ?? '')) {
                          updateMut.mutate({ id: app.id, status: app.status, notes: e.target.value })
                        }
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {app.cv_html && (
                      <button onClick={() => setSelectedApp(app)} className="text-blue-400 hover:text-blue-300">
                        <Eye size={14} />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {app.job?.url && (
                      <a href={app.job.url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-300">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
