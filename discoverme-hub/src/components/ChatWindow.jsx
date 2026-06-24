import React, { useState, useRef, useEffect, useCallback } from 'react'
import MessageBubble from './MessageBubble.jsx'
import { getAgent } from '../agents.js'

export default function ChatWindow({ agentId, messages, onSend, streaming }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const agent = getAgent(agentId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    onSend(text)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [input, streaming, onSend])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-base font-semibold shrink-0"
          style={{ backgroundColor: agent?.color }}
        >
          {agent?.emoji}
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{agent?.fullLabel}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {streaming ? 'Sta scrivendo…' : `${messages.length} messaggi`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50 dark:bg-slate-950">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-50">
            <span className="text-4xl">{agent?.emoji}</span>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
              Inizia una conversazione con il tuo <strong>{agent?.fullLabel}</strong>
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isLastAssistant =
              i === messages.length - 1 && msg.role === 'assistant' && streaming
            return (
              <MessageBubble
                key={i}
                message={msg}
                agentColor={agent?.color}
                isStreaming={isLastAssistant}
              />
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2">
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none outline-none min-h-[36px] max-h-[140px] py-1 leading-snug"
            placeholder="Scrivi un messaggio… (Invio per inviare, Shift+Invio per andare a capo)"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
            }}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
            style={{ backgroundColor: agent?.color }}
            aria-label="Invia"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
