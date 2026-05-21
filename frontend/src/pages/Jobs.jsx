import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  Search, Filter, CheckCircle2, XCircle, Send, FileText, ExternalLink, Trash2, RefreshCw,
} from 'lucide-react'
import { StatusBadge, SourceBadge } from '../components/StatusBadge'
import { getJobs, updateJobStatus, generateCV, applyToJob, deleteJob, triggerScrape } from '../api'

function ScoreBar({ score }) {
  if (score == null) return <span className="text-slate-600">–</span>
  const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'
  return <span className={`font-semibold ${color}`}>{Math.round(score)}%</span>
}

function CVModal({ job, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const qc = useQueryClient()

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await generateCV(job.id)
      setData(res)
      toast.success('CV generato con Claude AI!')
      qc.invalidateQueries({ queryKey: ['jobs'] })
    } catch {
      toast.error('Errore nella generazione del CV')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="font-semibold text-white">{job.title}</h3>
            <p className="text-slate-400 text-sm">{job.company} · {job.location}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!data ? (
            <div className="text-center py-10">
              <p className="text-slate-400 mb-4">Genera un CV personalizzato con Claude AI per questa offerta</p>
              <button onClick={handleGenerate} disabled={loading} className="btn-primary flex items-center gap-2 mx-auto">
                <FileText size={15} />
                {loading ? 'Generazione in corso...' : 'Genera CV con Claude AI'}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span className="text-emerald-300 text-sm">
                  Compatibilità: <strong>{Math.round(data.match_score)}%</strong> – {data.match_reason}
                </span>
              </div>

              <div>
                <h4 className="label">Lettera di presentazione</h4>
                <div className="bg-slate-800 rounded-lg p-4 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {data.cover_letter}
                </div>
              </div>

              <div>
                <h4 className="label">Anteprima CV</h4>
                <iframe
                  srcDoc={data.cv_html}
                  className="w-full h-[500px] rounded-lg border border-slate-700 bg-white"
                  title="CV Preview"
                />
              </div>
            </>
          )}
        </div>

        {data && (
          <div className="p-5 border-t border-slate-800 flex gap-3">
            <button
              onClick={() => {
                const w = window.open('', '_blank')
                w.document.write(data.cv_html)
                w.document.close()
                w.print()
              }}
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

export default function Jobs() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [selectedJob, setSelectedJob] = useState(null)
  const qc = useQueryClient()

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', statusFilter, sourceFilter, search],
    queryFn: () => getJobs({
      ...(statusFilter && { status: statusFilter }),
      ...(sourceFilter && { source: sourceFilter }),
      ...(search && { search }),
      limit: 100,
    }),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateJobStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const applyMut = useMutation({
    mutationFn: (id) => applyToJob(id),
    onSuccess: () => {
      toast.success('Candidatura avviata! 🚀')
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Errore'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const scrapeMut = useMutation({
    mutationFn: triggerScrape,
    onSuccess: () => toast.success('Ricerca avviata!'),
  })

  return (
    <div className="p-6 space-y-5">
      {selectedJob && <CVModal job={selectedJob} onClose={() => setSelectedJob(null)} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Offerte di Lavoro</h1>
        <button
          onClick={() => scrapeMut.mutate()}
          disabled={scrapeMut.isPending}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw size={15} className={scrapeMut.isPending ? 'animate-spin' : ''} />
          Nuova Ricerca
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Cerca titolo o azienda..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tutti gli stati</option>
          <option value="pending">In attesa</option>
          <option value="approved">Approvate</option>
          <option value="rejected">Rifiutate</option>
          <option value="applied">Inviate</option>
        </select>
        <select className="input w-36" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
          <option value="">Tutte le fonti</option>
          <option value="linkedin">LinkedIn</option>
          <option value="adecco">Adecco</option>
          <option value="randstad">Randstad</option>
        </select>
      </div>

      {/* Count */}
      <p className="text-sm text-slate-500">{jobs.length} offerte trovate</p>

      {/* Table */}
      {isLoading ? (
        <div className="card text-center py-10 text-slate-500">Caricamento...</div>
      ) : jobs.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">
          <p className="text-3xl mb-3">🔍</p>
          <p>Nessuna offerta. Avvia una ricerca!</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Fonte', 'Ruolo / Azienda', 'Luogo', 'Match', 'Stato', 'Azioni'].map(h => (
                  <th key={h} className="text-left text-xs text-slate-500 uppercase tracking-wider px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <SourceBadge source={job.source} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white line-clamp-1">{job.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{job.company}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-28 truncate">
                    {job.location}
                    {job.remote && <span className="ml-1 text-teal-400">(R)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBar score={job.match_score} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {job.status === 'pending' && (
                        <>
                          <button
                            onClick={() => statusMut.mutate({ id: job.id, status: 'approved' })}
                            className="btn-success py-1 px-2 text-xs"
                            title="Approva"
                          >
                            <CheckCircle2 size={12} />
                          </button>
                          <button
                            onClick={() => statusMut.mutate({ id: job.id, status: 'rejected' })}
                            className="btn-danger py-1 px-2 text-xs"
                            title="Rifiuta"
                          >
                            <XCircle size={12} />
                          </button>
                        </>
                      )}
                      {job.status === 'approved' && (
                        <button
                          onClick={() => applyMut.mutate(job.id)}
                          className="btn-primary py-1 px-2 text-xs flex items-center gap-1"
                          title="Invia candidatura"
                        >
                          <Send size={12} /> Invia
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="btn-ghost py-1 px-2 text-xs flex items-center gap-1"
                        title="Genera CV"
                      >
                        <FileText size={12} /> CV
                      </button>
                      <a href={job.url} target="_blank" rel="noreferrer"
                        className="btn-ghost py-1 px-2 text-xs"
                        title="Apri offerta"
                      >
                        <ExternalLink size={12} />
                      </a>
                      <button
                        onClick={() => { if (confirm('Eliminare questa offerta?')) deleteMut.mutate(job.id) }}
                        className="text-slate-600 hover:text-red-400 transition-colors p-1"
                        title="Elimina"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
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
