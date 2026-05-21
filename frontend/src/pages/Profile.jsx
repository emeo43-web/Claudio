import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Plus, X, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { getProfile, updateProfile } from '../api'

function TagInput({ tags = [], onChange, placeholder }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setInput('')
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 bg-blue-600/20 text-blue-300 text-xs px-2.5 py-1 rounded-full border border-blue-600/30">
            {tag}
            <button onClick={() => onChange(tags.filter(t => t !== tag))} className="hover:text-white">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input text-sm"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <button onClick={add} className="btn-ghost px-3"><Plus size={14} /></button>
      </div>
    </div>
  )
}

function ExperienceForm({ items = [], onChange }) {
  const [open, setOpen] = useState(null)
  const empty = { title: '', company: '', start: '', end: '', description: '' }

  const update = (i, field, val) => {
    const next = [...items]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  const add = () => { onChange([...items, { ...empty }]); setOpen(items.length) }

  return (
    <div className="space-y-2">
      {items.map((exp, i) => (
        <div key={i} className="bg-slate-800 rounded-lg border border-slate-700">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm"
          >
            <span className="font-medium text-white">{exp.title || 'Nuova esperienza'} {exp.company ? `@ ${exp.company}` : ''}</span>
            <div className="flex items-center gap-2">
              <button onClick={e => { e.stopPropagation(); remove(i) }} className="text-slate-600 hover:text-red-400">
                <X size={14} />
              </button>
              {open === i ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
            </div>
          </button>
          {open === i && (
            <div className="px-4 pb-4 grid grid-cols-2 gap-3">
              {[['Ruolo', 'title'], ['Azienda', 'company'], ['Inizio', 'start'], ['Fine', 'end']].map(([lbl, fld]) => (
                <div key={fld}>
                  <label className="label">{lbl}</label>
                  <input className="input text-sm" value={exp[fld] || ''} onChange={e => update(i, fld, e.target.value)} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="label">Descrizione</label>
                <textarea
                  className="input text-sm resize-none"
                  rows={3}
                  value={exp.description || ''}
                  onChange={e => update(i, 'description', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      ))}
      <button onClick={add} className="btn-ghost w-full flex items-center gap-2 justify-center text-sm">
        <Plus size={14} /> Aggiungi esperienza
      </button>
    </div>
  )
}

function EducationForm({ items = [], onChange }) {
  const empty = { degree: '', field: '', institution: '', year: '' }
  const update = (i, field, val) => { const n = [...items]; n[i] = { ...n[i], [field]: val }; onChange(n) }
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      {items.map((edu, i) => (
        <div key={i} className="bg-slate-800 rounded-lg border border-slate-700 p-4 grid grid-cols-2 gap-3 relative">
          <button onClick={() => remove(i)} className="absolute top-3 right-3 text-slate-600 hover:text-red-400">
            <X size={14} />
          </button>
          {[['Titolo', 'degree'], ['Materia', 'field'], ['Istituto', 'institution'], ['Anno', 'year']].map(([lbl, fld]) => (
            <div key={fld}>
              <label className="label">{lbl}</label>
              <input className="input text-sm" value={edu[fld] || ''} onChange={e => update(i, fld, e.target.value)} />
            </div>
          ))}
        </div>
      ))}
      <button onClick={() => onChange([...items, { ...empty }])} className="btn-ghost w-full flex items-center gap-2 justify-center text-sm">
        <Plus size={14} /> Aggiungi formazione
      </button>
    </div>
  )
}

function LanguageForm({ items = [], onChange }) {
  const empty = { language: '', level: 'B2' }
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Madrelingua']
  const update = (i, field, val) => { const n = [...items]; n[i] = { ...n[i], [field]: val }; onChange(n) }
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      {items.map((lang, i) => (
        <div key={i} className="flex gap-3 items-center">
          <input
            className="input text-sm flex-1"
            placeholder="Lingua"
            value={lang.language || ''}
            onChange={e => update(i, 'language', e.target.value)}
          />
          <select className="input text-sm w-36" value={lang.level || 'B2'} onChange={e => update(i, 'level', e.target.value)}>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <button onClick={() => remove(i)} className="text-slate-600 hover:text-red-400"><X size={14} /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, { ...empty }])} className="btn-ghost w-full flex items-center gap-2 justify-center text-sm">
        <Plus size={14} /> Aggiungi lingua
      </button>
    </div>
  )
}

export default function Profile() {
  const qc = useQueryClient()
  const { data: profile, isLoading } = useQuery({ queryKey: ['profile'], queryFn: getProfile })
  const [form, setForm] = useState(null)

  useEffect(() => { if (profile) setForm({ ...profile }) }, [profile])

  const saveMut = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }); toast.success('Profilo salvato!') },
    onError: () => toast.error('Errore nel salvataggio'),
  })

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  if (isLoading || !form) return <div className="p-6 text-slate-500">Caricamento...</div>

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Profilo</h1>
        <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} className="btn-primary flex items-center gap-2">
          <Save size={15} />
          {saveMut.isPending ? 'Salvataggio...' : 'Salva Profilo'}
        </button>
      </div>

      <p className="text-sm text-slate-400 bg-blue-600/10 border border-blue-600/20 rounded-lg px-4 py-3">
        💡 Il tuo profilo viene usato da Claude AI per generare CV e lettere di presentazione personalizzate per ogni offerta.
      </p>

      {/* Personal Info */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-white">Informazioni personali</h2>
        <div className="grid grid-cols-2 gap-4">
          {[['Nome completo', 'name', 'text'], ['Email', 'email', 'email'], ['Telefono', 'phone', 'tel'], ['Città', 'location', 'text'], ['URL LinkedIn', 'linkedin_url', 'url']].map(([lbl, fld, type]) => (
            <div key={fld} className={fld === 'linkedin_url' ? 'col-span-2' : ''}>
              <label className="label">{lbl}</label>
              <input type={type} className="input text-sm" value={form[fld] || ''} onChange={e => set(fld, e.target.value)} />
            </div>
          ))}
          <div className="col-span-2">
            <label className="label">Sommario professionale</label>
            <textarea
              className="input text-sm resize-none"
              rows={4}
              placeholder="Descrivi brevemente la tua carriera, punti di forza e obiettivi..."
              value={form.summary || ''}
              onChange={e => set('summary', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="card space-y-3">
        <h2 className="text-base font-semibold text-white">Competenze</h2>
        <TagInput tags={form.skills || []} onChange={v => set('skills', v)} placeholder="Es. Python, React, SQL..." />
      </div>

      {/* Experience */}
      <div className="card space-y-3">
        <h2 className="text-base font-semibold text-white">Esperienze lavorative</h2>
        <ExperienceForm items={form.experience || []} onChange={v => set('experience', v)} />
      </div>

      {/* Education */}
      <div className="card space-y-3">
        <h2 className="text-base font-semibold text-white">Formazione</h2>
        <EducationForm items={form.education || []} onChange={v => set('education', v)} />
      </div>

      {/* Languages */}
      <div className="card space-y-3">
        <h2 className="text-base font-semibold text-white">Lingue</h2>
        <LanguageForm items={form.languages || []} onChange={v => set('languages', v)} />
      </div>
    </div>
  )
}
