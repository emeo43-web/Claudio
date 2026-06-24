import React, { useState } from 'react'

export default function SyncButton({ onSync, syncing }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={onSync}
        disabled={syncing}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all
          bg-[#C4622D] hover:bg-[#a84e22] text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className={`w-3.5 h-3.5 shrink-0 ${syncing ? 'animate-spin' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
        {syncing ? 'Aggiornando…' : 'Aggiorna PM'}
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-1.5 w-52 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-50 pointer-events-none">
          Legge le ultime 6 risposte di tutti gli agenti e invia una sintesi al PM
          <div className="absolute top-full left-4 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  )
}
