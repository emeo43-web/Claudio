import { useState, useCallback } from 'react'

export function useAgentAPI({ onToken, onDone, onError }) {
  const [streaming, setStreaming] = useState(false)

  const sendMessage = useCallback(async (agentId, messages) => {
    setStreaming(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, messages }),
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
            if (parsed.error) {
              onError?.(parsed.error)
            } else if (parsed.done) {
              onDone?.(parsed)
            } else if (parsed.text) {
              onToken?.(parsed.text)
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }
    } catch (err) {
      onError?.(err.message)
    } finally {
      setStreaming(false)
    }
  }, [onToken, onDone, onError])

  const pmSync = useCallback(async ({ onToken, onDone, onError }) => {
    setStreaming(true)
    try {
      const res = await fetch('/api/pm-sync', { method: 'POST' })
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
            if (parsed.error) onError?.(parsed.error)
            else if (parsed.done) onDone?.(parsed)
            else if (parsed.text) onToken?.(parsed.text)
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      onError?.(err.message)
    } finally {
      setStreaming(false)
    }
  }, [])

  return { streaming, sendMessage, pmSync }
}
