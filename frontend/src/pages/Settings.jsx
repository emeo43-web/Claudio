import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Save, RefreshCw, Plus, X } from 'lucide-react'
import { getSearchConfig, updateSearchConfig, getScrapeLogs, triggerScrape } from '../api'

function KeywordInput({ keywords = [], onChange }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !keywords.includes(v)) onChange([...keywords, v])
    setInput('')
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {keywords.map(kw => (
          <span key={kw} className="flex items-center gap-1 bg-slate-700 text-slate-200 text-xs px-3 py-1 rounded-full">
            {kw}
            <button onClick={() => onChange(keywords.filter(k => k !== kw))} className="hover:text-red-400 ml-0.5">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input text-sm"
          placeholder="Es. Python Developer, Data Analyst..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <button onClick={add} className="btn-ghost px-3"><Plus size={14} /></button>
      </div>
    </div>
  )
}

const SOURCE_OPTIONS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'adecco', label: 'Adecco' },
  { id: 'randstad', label: 'Randstad' },
]

function LogRow({ log }) {
  const fmt = (d) => d ? new Date(d).toLocaleString('it-IT') : '–'
  const colors = { completed: 'text-emerald-400', failed: 'text-red-400', running: 'text-yellow-400' }
  return (
    <tr className="border-b border-slate-800/50 text-sm">
      <td className="px-4 py-2 text-slate-400 text-xs">{fmt(log.started_at)}</td>
      <td className="px-4 py-2 capitalize text-slate-300">{log.source}</td>
      <td className={`px-4 py-2 capitalize ${colors[log.status] || 'text-slate-400'}`}>{log.status}</td>
      <td className="px-4 py-2 text-slate-400">{log.jobs_found}</td>
      <td className="px-4 py-2 text-emerald-400">{log.jobs_new}</td>
      {log.error && <td className="px-4 py-2 text-red-400 text-xs truncate max-w-xs">{log.error}</td>}
    </tr>
  )
}

export default function Settings() {
  const qc = useQueryClient()
  const { data: config, isLoading } = useQuery({ queryKey: ['search-config'], queryFn: getSearchConfig })
  const { data: logs = [] } = useQuery({ queryKey: ['scrape-logs'], queryFn: getScrapeLogs })
  const [form, setForm] = useState(null)

  useEffect(() => { if (config) setForm({ ...config }) }, [config])

  const saveMut = useMutation({
    mutationFn: updateSearchConfig,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['search-config'] }); toast.success('Impostazioni salvate!') },
    onError: () => toast.error('Errore nel salvataggio'),
  })

  const scrapeMut = useMutation({
    mutationFn: triggerScrape,
    onSuccess: () => { toast.success('Ricerca avviata!'); setTimeout(() => qc.invalidateQueries(['scrape-logs']), 3000) },
  })

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const toggleSource = (src) => {
    const current = form.sources || []
    const next = current.includes(src) ? current.filter(s => s !== src) : [...current, src]
    set('sources', next)
  }

  if (isLoading || !form) return <div className="p-6 text-slate-500">Caricamento...</div>

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Impostazioni</h1>
        <div className="flex gap-3">
          <button onClick={() => scrapeMut.mutate()} disabled={scrapeMut.isPending} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={15} className={scrapeMut.isPending ? 'animate-spin' : ''} />
            Avvia Ricerca
          </button>
          <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} className="btn-primary flex items-center gap-2">
            <Save size={15} />
            {saveMut.isPending ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>

      {/* Search config */}
      <div className="card space-y-5">
        <h2 className="text-base font-semibold text-white">Configurazione Ricerca</h2>

        <div>
          <label className="label">Parole chiave</label>
          <KeywordInput keywords={form.keywords || []} onChange={v => set('keywords', v)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Luogo</label>
            <input className="input text-sm" value={form.location || ''} onChange={e => set('location', e.target.value)} />
          </div>
          <div>
            <label className="label">Score minimo candidatura</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={100} step={5}
                value={form.min_match_score || 65}
                onChange={e => set('min_match_score', Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-blue-400 font-semibold w-10">{form.min_match_score}%</span>
            </div>
          </div>
        </div>

        <div>
          <label className="label">Fonti di ricerca</label>
          <div className="flex gap-3">
            {SOURCE_OPTIONS.map(src => (
              <label key={src.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(form.sources || []).includes(src.id)}
                  onChange={() => toggleSource(src.id)}
                  className="accent-blue-500 w-4 h-4"
                />
                <span className="text-sm text-slate-300">{src.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.remote_only || false}
              onChange={e => set('remote_only', e.target.checked)}
              className="accent-blue-500 w-4 h-4"
            />
            <span className="text-sm text-slate-300">Solo posizioni remote</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.auto_apply || false}
              onChange={e => set('auto_apply', e.target.checked)}
              className="accent-blue-500 w-4 h-4"
            />
            <span className="text-sm text-slate-300">Auto-apply (no supervisione)</span>
          </label>
        </div>

        <div>
          <label className="label">Max candidature al giorno</label>
          <input
            type="number" min={1} max={50}
            className="input text-sm w-24"
            value={form.max_applications_per_day || 10}
            onChange={e => set('max_applications_per_day', Number(e.target.value))}
          />
        </div>
      </div>

      {/* Credentials note */}
      <div className="card space-y-3">
        <h2 className="text-base font-semibold text-white">Credenziali account</h2>
        <p className="text-sm text-slate-400">
          Le credenziali vengono lette dal file <code className="text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded">.env</code> nella root del progetto per sicurezza.
        </p>
        <div className="bg-slate-800 rounded-lg p-4 text-xs font-mono text-slate-400 space-y-1">
          <p>LINKEDIN_EMAIL=tua@email.com</p>
          <p>LINKEDIN_PASSWORD=password</p>
          <p>ADECCO_EMAIL=tua@email.com</p>
          <p>ADECCO_PASSWORD=password</p>
          <p>RANDSTAD_EMAIL=tua@email.com</p>
          <p>RANDSTAD_PASSWORD=password</p>
          <p>ANTHROPIC_API_KEY=sk-ant-...</p>
        </div>
      </div>

      {/* Scrape logs */}
      <div className="card space-y-3">
        <h2 className="text-base font-semibold text-white">Log ricerche</h2>
        {logs.length === 0 ? (
          <p className="text-slate-500 text-sm">Nessuna ricerca eseguita ancora.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Data', 'Fonte', 'Stato', 'Trovate', 'Nuove'].map(h => (
                    <th key={h} className="text-left text-xs text-slate-500 px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 20).map(log => <LogRow key={log.id} log={log} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
