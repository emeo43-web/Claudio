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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DATA_PATH = join(__dirname, 'data', 'conversations.json')
const PROMPTS_DIR = join(__dirname, 'prompts')

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

// GET conversations
app.get('/api/conversations', (req, res) => {
  res.json(loadConversations())
})

// POST chat with streaming
app.post('/api/chat', async (req, res) => {
  const { agentId, messages } = req.body
  if (!agentId || !messages) return res.status(400).json({ error: 'agentId and messages required' })

  const systemPrompt = loadSystemPrompt(agentId)

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    })

    let fullText = ''

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const text = chunk.delta.text
        fullText += text
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()

    // Persist the completed exchange
    const conversations = loadConversations()
    const lastUserMsg = messages[messages.length - 1]
    conversations[agentId] = messages
    conversations[agentId].push({ role: 'assistant', content: fullText })
    saveConversations(conversations)
  } catch (err) {
    console.error('Anthropic error:', err.message)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

// POST pm-sync: reads last 6 messages from each non-PM agent, sends to PM
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

  for (const agentId of agents) {
    const msgs = conversations[agentId] || []
    const last6 = msgs.slice(-6)
    if (last6.length === 0) continue
    syncContent += `## ${agentLabels[agentId]}\n`
    for (const msg of last6) {
      const label = msg.role === 'user' ? 'USER' : agentLabels[agentId].toUpperCase()
      syncContent += `**${label}:** ${msg.content}\n\n`
    }
    syncContent += '\n'
  }

  if (syncContent.trim() === '[SYNC TEAM] — Aggiornamento da tutti gli agenti del team:') {
    return res.status(400).json({ error: 'Nessuna conversazione da sincronizzare.' })
  }

  const pmHistory = conversations['pm'] || []
  const messagesForPM = [...pmHistory, { role: 'user', content: syncContent }]
  const systemPrompt = loadSystemPrompt('pm')

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messagesForPM,
    })

    let fullText = ''

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const text = chunk.delta.text
        fullText += text
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
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

// POST clear a single agent's conversation
app.post('/api/clear', (req, res) => {
  const { agentId } = req.body
  if (!agentId) return res.status(400).json({ error: 'agentId required' })
  const conversations = loadConversations()
  conversations[agentId] = []
  saveConversations(conversations)
  res.json({ ok: true })
})

const PORT = 3001
app.listen(PORT, () => console.log(`DiscoverME proxy server running on http://localhost:${PORT}`))
