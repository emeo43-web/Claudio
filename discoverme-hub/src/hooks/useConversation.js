import { useState, useEffect, useCallback } from 'react'

export function useConversation() {
  const [conversations, setConversations] = useState({
    pm: [], product: [], growth: [], institutional: [], tech: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/conversations')
      .then((r) => r.json())
      .then((data) => {
        setConversations(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const addMessage = useCallback((agentId, message) => {
    setConversations((prev) => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), message],
    }))
  }, [])

  const updateLastAssistantMessage = useCallback((agentId, content) => {
    setConversations((prev) => {
      const msgs = [...(prev[agentId] || [])]
      if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content }
      }
      return { ...prev, [agentId]: msgs }
    })
  }, [])

  const clearConversation = useCallback((agentId) => {
    setConversations((prev) => ({ ...prev, [agentId]: [] }))
    fetch('/api/conversations')
      .then((r) => r.json())
      .then((data) => {
        data[agentId] = []
        return fetch('/api/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId }),
        })
      })
  }, [])

  return { conversations, loading, addMessage, updateLastAssistantMessage, clearConversation }
}
