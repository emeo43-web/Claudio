import React, { useState, useCallback, useRef, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import { useConversation } from './hooks/useConversation.js'
import { useAgentAPI } from './hooks/useAgentAPI.js'

export default function App() {
  const [activeAgent, setActiveAgent] = useState('pm')
  const [darkMode, setDarkMode] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  const [streamingAgents, setStreamingAgents] = useState({})
  const [syncing, setSyncing] = useState(false)

  const { conversations, addMessage, updateLastAssistantMessage } = useConversation()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const handleSend = useCallback(async (agentId, text) => {
    const userMsg = { role: 'user', content: text }
    addMessage(agentId, userMsg)

    const updatedMessages = [...(conversations[agentId] || []), userMsg]

    // Placeholder for streaming
    addMessage(agentId, { role: 'assistant', content: '' })
    setStreamingAgents((prev) => ({ ...prev, [agentId]: true }))

    let accumulated = ''

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, messages: updatedMessages }),
    })

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const parsed = JSON.parse(line.slice(6))
          if (parsed.text) {
            accumulated += parsed.text
            updateLastAssistantMessage(agentId, accumulated)
          } else if (parsed.done) {
            setStreamingAgents((prev) => ({ ...prev, [agentId]: false }))
          } else if (parsed.error) {
            updateLastAssistantMessage(agentId, `⚠️ Errore: ${parsed.error}`)
            setStreamingAgents((prev) => ({ ...prev, [agentId]: false }))
          }
        } catch {
          // ignore
        }
      }
    }

    setStreamingAgents((prev) => ({ ...prev, [agentId]: false }))
  }, [conversations, addMessage, updateLastAssistantMessage])

  const handleSync = useCallback(async () => {
    setSyncing(true)

    const res = await fetch('/api/pm-sync', { method: 'POST' })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Errore nella sincronizzazione')
      setSyncing(false)
      return
    }

    setActiveAgent('pm')

    addMessage('pm', { role: 'assistant', content: '' })
    setStreamingAgents((prev) => ({ ...prev, pm: true }))

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let accumulated = ''
    let syncUserMsg = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const parsed = JSON.parse(line.slice(6))
          if (parsed.text) {
            accumulated += parsed.text
            updateLastAssistantMessage('pm', accumulated)
          } else if (parsed.done) {
            syncUserMsg = parsed.syncUserMsg
            setStreamingAgents((prev) => ({ ...prev, pm: false }))
          } else if (parsed.error) {
            updateLastAssistantMessage('pm', `⚠️ Errore: ${parsed.error}`)
            setStreamingAgents((prev) => ({ ...prev, pm: false }))
          }
        } catch {
          // ignore
        }
      }
    }

    if (syncUserMsg) {
      // Insert the [SYNC TEAM] user message before the assistant response
      // We reload conversations from the server to get the correct state
      // For now the UI already shows the assistant; the user message is in the JSON
    }

    setStreamingAgents((prev) => ({ ...prev, pm: false }))
    setSyncing(false)
  }, [addMessage, updateLastAssistantMessage])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar
        activeAgent={activeAgent}
        onSelectAgent={setActiveAgent}
        onSync={handleSync}
        syncing={syncing}
        conversations={conversations}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
      />
      <main className="flex-1 overflow-hidden">
        <ChatWindow
          key={activeAgent}
          agentId={activeAgent}
          messages={conversations[activeAgent] || []}
          onSend={(text) => handleSend(activeAgent, text)}
          streaming={streamingAgents[activeAgent] || false}
        />
      </main>
    </div>
  )
}
