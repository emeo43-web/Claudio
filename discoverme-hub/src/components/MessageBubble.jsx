import React, { useMemo } from 'react'

function parseMarkdown(text) {
  // Basic markdown: bold, italic, headers, lists, inline code, code blocks
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code blocks
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>')

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Unordered lists
  html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p>')
  html = html.replace(/\n/g, '<br />')

  return `<p>${html}</p>`
}

export default function MessageBubble({ message, agentColor, isStreaming }) {
  const isUser = message.role === 'user'

  const htmlContent = useMemo(() => {
    if (isUser) return null
    return parseMarkdown(message.content || '')
  }, [message.content, isUser])

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div
          className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-sm text-white text-sm leading-relaxed whitespace-pre-wrap"
          style={{ backgroundColor: agentColor }}
        >
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm leading-relaxed shadow-sm">
        <div
          className="message-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-slate-400 dark:bg-slate-500 ml-0.5 align-middle cursor-blink" />
        )}
      </div>
    </div>
  )
}
