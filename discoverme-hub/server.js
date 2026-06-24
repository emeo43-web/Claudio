import express from 'express'
import cors from 'cors'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import 'dotenv/config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json())

const API_KEY = process.env.ANTHROPIC_API_KEY
const DEMO_MODE = !API_KEY || !API_KEY.startsWith('sk-')
const client = DEMO_MODE ? null : new Anthropic({ apiKey: API_KEY })

if (DEMO_MODE) {
  console.log('⚠️  DEMO MODE attiva: nessuna ANTHROPIC_API_KEY valida trovata.')
  console.log('   Le risposte sono simulate. Aggiungi la key in .env per usare Claude reale.')
}

const DATA_PATH = join(__dirname, 'data', 'conversations.json')
const PROMPTS_DIR = join(__dirname, 'prompts')
const DIST_DIR = join(__dirname, 'dist')

function loadConversations() {
  if (!existsSync(DATA_PATH)) {
    const empty = { pm: [], product: [], growth: [], institutional: [], tech: [] }
    mkdirSync(dirname(DATA_PATH), { recursive: true })
    writeFileSync(DATA_PATH, JSON.stringify(empty, null, 2))
    return empty
  }
  return JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
}

function saveConversations(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
}

function loadSystemPrompt(agentId) {
  const promptPath = join(PROMPTS_DIR, `${agentId}.md`)
  if (!existsSync(promptPath)) return ''
  return readFileSync(promptPath, 'utf-8')
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Streams arbitrary text to the client chunk-by-chunk as SSE (used by demo mode).
async function streamDemoText(res, text) {
  const tokens = text.match(/\S+\s*|\n/g) || [text]
  for (const tok of tokens) {
    res.write(`data: ${JSON.stringify({ text: tok })}\n\n`)
    await sleep(18)
  }
}

// Simulated, in-character responses used when no API key is configured.
const DEMO_REPLIES = {
  pm: (q) =>
`_(risposta simulata — demo senza API key)_

Ricevuto: **"${q}"**

**1. Stato per area**
- Product: flussi PWA in definizione
- Growth: pivot su porta-a-porta confermato
- Istituzionale: call LUMSA fissata
- Tech: prototipo Lovable da rifare

**2. Blocchi critici**
- Mappe non funzionanti sul prototipo
- Zero conversioni dalle ads online

**3. Priorità della settimana**
1. Riscrivere il prompt Base44 per le mappe
2. Preparare materiale per la call istituzionale
3. Primo giro porta-a-porta a Palermo

**4. Prossime azioni**
- Mandare mail alla Prof.ssa Marino
- Definire 5 monumenti pilota con coordinate GPS`,

  product: (q) =>
`_(risposta simulata — demo senza API key)_

Sul punto **"${q}"**: parto dal principio UX fondamentale — il turista ha 4-6 ore, **zero friction**, coupon visibile subito.

Proposta di flusso PWA (390px):
1. Landing → coupon già visibile, nessun login
2. Tap "Sblocca" → richiesta GPS
3. A 150m dal monumento → coupon attivo \`DUOMO-4821\`
4. Gamification come layer opzionale, mai bloccante

Vuoi che butti giù il prompt dettagliato per Lovable/Base44?`,

  growth: (q) =>
`_(risposta simulata — demo senza API key)_

Su **"${q}"**: i dati parlano chiaro — €0.11/visita ma **0 conversioni** dalle ads. I commercianti siciliani old-style non convertono online.

Strategia:
- **Canale**: porta a porta + WhatsApp diretto
- **Pitch**: "turisti gratis, zero costi, paga l'ente"
- **Materiale**: one-pager cartaceo + QR alla landing

Ti preparo il copy del messaggio WhatsApp di primo contatto?`,

  institutional: (q) =>
`_(risposta simulata — demo senza API key)_

Su **"${q}"**: il modello B2G regge se leghiamo i dati alla rendicontazione dei fondi pubblici.

Leve disponibili:
- **Fondi**: PON Metro, FESR Sicilia 2021-2027, PNRR M1C3
- **Contatti caldi**: Prof.ssa Lo Presti (LUMSA, call fissata)
- **Aggancio narrativo**: AdSP Palermo — "economie solide attorno a ogni approdo"

Preparo la traccia per la call LUMSA?`,

  tech: (q) =>
`_(risposta simulata — demo senza API key)_

Su **"${q}"**: il nodo è il prototipo Lovable con mappe rotte e locali fittizi.

Approccio:
- **DB Supabase**: \`monuments\` con lat/lng, \`coupons\`, \`redemptions\`
- **GPS**: \`watchPosition\` ogni 30s, sblocco a <150m (haversine)
- **Coupon**: formato \`MONUMENTO-4CIFRE\`, scadenza mezzanotte

Ti scrivo il prompt tecnico preciso per Base44 con lo schema completo?`,
}

function demoReply(agentId, userText) {
  const q = (userText || '').slice(0, 80)
  const fn = DEMO_REPLIES[agentId] || DEMO_REPLIES.pm
  return fn(q)
}

function demoSyncReply() {
  return `_(risposta simulata — demo senza API key)_

**[SYNC TEAM] elaborato.**

**1. Stato attuale per area**
- Product Designer: flussi UX delle 3 interfacce in definizione
- Growth: confermato pivot porta-a-porta, ads online accantonate
- Istituzionale: call LUMSA fissata, mail Marino in coda
- Tech: prototipo Lovable da rifare, mappe non funzionanti

**2. Blocchi critici**
- Mappe rotte sul prototipo → blocca le demo
- Nessun canale di acquisizione commercianti ancora validato sul campo

**3. Priorità della settimana**
1. Sistemare le mappe (prompt Base44 da Tech + Product)
2. Primo giro porta-a-porta a Palermo (Growth)
3. Call istituzionale LUMSA con materiale pronto (Istituzionale)

**4. Prossime azioni concrete**
- Tech + Product: prompt unico per Base44 con schema GPS
- Growth: 10 commercianti target + copy WhatsApp
- Istituzionale: traccia call + mail Prof.ssa Marino`
}

// ---- API ----

app.get('/api/conversations', (req, res) => {
  res.json(loadConversations())
})

app.post('/api/chat', async (req, res) => {
  const { agentId, messages } = req.body
  if (!agentId || !messages) return res.status(400).json({ error: 'agentId and messages required' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    let fullText = ''

    if (DEMO_MODE) {
      const lastUser = messages[messages.length - 1]
      fullText = demoReply(agentId, lastUser?.content)
      await streamDemoText(res, fullText)
    } else {
      const systemPrompt = loadSystemPrompt(agentId)
      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      })
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          fullText += chunk.delta.text
          res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
        }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()

    const conversations = loadConversations()
    conversations[agentId] = messages
    conversations[agentId].push({ role: 'assistant', content: fullText })
    saveConversations(conversations)
  } catch (err) {
    console.error('Chat error:', err.message)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

app.post('/api/pm-sync', async (req, res) => {
  const conversations = loadConversations()
  const agents = ['product', 'growth', 'institutional', 'tech']
  const agentLabels = {
    product: 'Product Designer',
    growth: 'Growth & Marketing',
    institutional: 'Relazioni Istituzionali',
    tech: 'Tech Advisor',
  }

  let syncContent = '[SYNC TEAM] — Aggiornamento da tutti gli agenti del team:\n\n'
  let hasContent = false

  for (const agentId of agents) {
    const msgs = conversations[agentId] || []
    const last6 = msgs.slice(-6)
    if (last6.length === 0) continue
    hasContent = true
    syncContent += `## ${agentLabels[agentId]}\n`
    for (const msg of last6) {
      const label = msg.role === 'user' ? 'USER' : agentLabels[agentId].toUpperCase()
      syncContent += `**${label}:** ${msg.content}\n\n`
    }
    syncContent += '\n'
  }

  if (!hasContent && !DEMO_MODE) {
    return res.status(400).json({ error: 'Nessuna conversazione da sincronizzare.' })
  }

  const pmHistory = conversations['pm'] || []
  const messagesForPM = [...pmHistory, { role: 'user', content: syncContent }]

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    let fullText = ''

    if (DEMO_MODE) {
      fullText = demoSyncReply()
      await streamDemoText(res, fullText)
    } else {
      const systemPrompt = loadSystemPrompt('pm')
      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: messagesForPM,
      })
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          fullText += chunk.delta.text
          res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
        }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, syncUserMsg: syncContent })}\n\n`)
    res.end()

    conversations['pm'] = messagesForPM
    conversations['pm'].push({ role: 'assistant', content: fullText })
    saveConversations(conversations)
  } catch (err) {
    console.error('PM sync error:', err.message)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

app.post('/api/clear', (req, res) => {
  const { agentId } = req.body
  if (!agentId) return res.status(400).json({ error: 'agentId required' })
  const conversations = loadConversations()
  conversations[agentId] = []
  saveConversations(conversations)
  res.json({ ok: true })
})

// ---- Static build (production / tunnel preview) ----
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  // SPA fallback for any non-API GET route
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(join(DIST_DIR, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`DiscoverME server running on http://localhost:${PORT}`)
  if (existsSync(DIST_DIR)) console.log('Serving static build from /dist')
})
