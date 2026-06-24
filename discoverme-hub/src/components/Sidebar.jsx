import React from 'react'
import { AGENTS } from '../agents.js'
import SyncButton from './SyncButton.jsx'

export default function Sidebar({ activeAgent, onSelectAgent, onSync, syncing, conversations, darkMode, onToggleDark }) {
  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#1A3A6B] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">D</span>
          </div>
          <div>
            <p className="text-xs font-bold text-[#1A3A6B] dark:text-blue-400 leading-none">DiscoverME</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">Agent Hub</p>
          </div>
        </div>
      </div>

      {/* Agents */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <p className="px-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
          Agenti
        </p>
        {AGENTS.map((agent) => {
          const msgs = conversations[agent.id] || []
          const unread = msgs.length
          const isActive = activeAgent === agent.id

          return (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                isActive
                  ? 'text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              style={isActive ? { backgroundColor: agent.color } : {}}
            >
              <span className="text-base shrink-0">{agent.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{agent.label}</p>
                <p className={`text-[10px] truncate ${isActive ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                  {agent.fullLabel}
                </p>
              </div>
              {unread > 0 && (
                <span
                  className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 shrink-0 ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {unread}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <SyncButton onSync={onSync} syncing={syncing} />

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {darkMode ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
              Modalità chiara
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
              Modalità scura
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
