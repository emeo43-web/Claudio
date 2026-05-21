import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  Briefcase, Clock, Send, Trophy, RefreshCw, CheckCircle2, XCircle, ExternalLink,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import StatCard from '../components/StatCard'
import { StatusBadge, SourceBadge } from '../components/StatusBadge'
import { getStats, getJobs, updateJobStatus, triggerScrape } from '../api'

function ScoreBar({ score }) {
  if (score == null) return <span className="text-slate-600 text-xs">–</span>
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-800 rounded-full h-1.5 w-16">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-slate-400">{Math.round(score)}%</span>
    </div>
  )
}

export default function Dashboard() {
  const qc = useQueryClient()
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats })
  const { data: pendingJobs = [] } = useQuery({
    queryKey: ['jobs', 'pending'],
    queryFn: () => getJobs({ status: 'pending', limit: 8 }),
  })

  const scrapeMut = useMutation({
    mutationFn: triggerScrape,
    onSuccess: () => {
      toast.success('Ricerca avviata in background!')
      setTimeout(() => qc.invalidateQueries(), 5000)
    },
    onError: () => toast.error('Errore durante la ricerca'),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateJobStatus(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success(status === 'approved' ? 'Offerta approvata ✓' : 'Offerta rifiutata')
    },
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => scrapeMut.mutate()}
          disabled={scrapeMut.isPending}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw size={15} className={scrapeMut.isPending ? 'animate-spin' : ''} />
          {scrapeMut.isPending ? 'Ricerca...' : 'Avvia Ricerca'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Nuove oggi" value={stats?.jobs_today} icon={Briefcase} color="blue" />
        <StatCard
          label="Da revisionare"
          value={stats?.pending_review}
          icon={Clock}
          color="yellow"
          sub={stats?.pending_review > 0 ? 'Richiedono attenzione' : undefined}
        />
        <StatCard label="Candidature inviate" value={stats?.applications_sent} icon={Send} color="emerald" />
        <StatCard
          label="Colloqui / Offerte"
          value={`${stats?.interviews ?? 0} / ${stats?.offers ?? 0}`}
          icon={Trophy}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Pending jobs */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Offerte da Revisionare
              {pendingJobs.length > 0 && (
                <span className="ml-2 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full border border-yellow-500/30">
                  {pendingJobs.length}
                </span>
              )}
            </h2>
          </div>

          {pendingJobs.length === 0 ? (
            <div className="card text-center py-10 text-slate-500">
              <p className="text-4xl mb-3">🎉</p>
              <p>Nessuna offerta in attesa. Avvia una ricerca!</p>
            </div>
          ) : (
            pendingJobs.map(job => (
              <div key={job.id} className="card hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <SourceBadge source={job.source} />
                      {job.remote && (
                        <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded border border-teal-500/30">
                          Remote
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-white text-sm truncate">{job.title}</p>
                    <p className="text-slate-400 text-sm">{job.company} · {job.location}</p>
                    {job.match_reason && (
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{job.match_reason}</p>
                    )}
                    <div className="mt-2">
                      <ScoreBar score={job.match_score} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => statusMut.mutate({ id: job.id, status: 'approved' })}
                      className="btn-success flex items-center gap-1"
                    >
                      <CheckCircle2 size={13} /> Approva
                    </button>
                    <button
                      onClick={() => statusMut.mutate({ id: job.id, status: 'rejected' })}
                      className="btn-danger flex items-center gap-1"
                    >
                      <XCircle size={13} /> Rifiuta
                    </button>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost flex items-center gap-1 text-center justify-center"
                    >
                      <ExternalLink size={13} /> Link
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chart */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">Candidature (14 giorni)</h2>
          <div className="card h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.timeline ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={d => d.slice(5)}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Area type="monotone" dataKey="applications" stroke="#3b82f6" fill="url(#grad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Source breakdown */}
          <h2 className="text-base font-semibold text-white">Per fonte</h2>
          <div className="card space-y-2">
            {Object.entries(stats?.by_source ?? {}).map(([src, count]) => (
              <div key={src} className="flex items-center justify-between">
                <SourceBadge source={src} />
                <span className="text-slate-300 text-sm font-medium">{count}</span>
              </div>
            ))}
            {Object.keys(stats?.by_source ?? {}).length === 0 && (
              <p className="text-slate-600 text-sm text-center py-2">Nessun dato</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
