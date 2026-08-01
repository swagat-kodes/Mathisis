import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Send, BookOpen, Sparkles, Bot, User, AlertCircle } from 'lucide-react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function ChatPanel({ subjectId }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: '👋 Hi! I\'m your AI Tutor. Ask me anything about the selected subject — I\'ll answer using your textbooks and cite the source pages.',
      sources: [],
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Reset chat when subject changes
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      text: '📚 Subject selected! Ask me anything — I\'ll find answers from your textbooks.',
      sources: [],
    }])
  }, [subjectId])

  const sendMessage = async () => {
    if (!input.trim() || loading || !subjectId) return

    const userMsg = { id: Date.now(), role: 'user', text: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch(`${API}/student/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject_id: subjectId, query: input }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to get answer')

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        text: data.answer,
        sources: data.sources || [],
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'error',
        text: `Error: ${err.message}`,
        sources: [],
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.aiIcon}><Bot size={18} color="#60a5fa" /></div>
          <div>
            <p style={styles.headerTitle}>AI Tutor</p>
            <p style={styles.headerSub}>{subjectId ? 'Ready to answer' : 'Select a subject first'}</p>
          </div>
        </div>
        <span className="badge badge-blue"><Sparkles size={11} /> Gemini 2.0</span>
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.map(msg => (
          <div key={msg.id} className="fade-in-up"
            style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '0.375rem' }}>
            <div style={styles.msgMeta(msg.role)}>
              {msg.role !== 'user' && (msg.role === 'error' ? <AlertCircle size={13} /> : <Bot size={13} />)}
              <span>{msg.role === 'user' ? 'You' : msg.role === 'error' ? 'Error' : 'AI Tutor'}</span>
              {msg.role === 'user' && <User size={13} />}
            </div>

            <div style={styles.bubble(msg.role)}>
              <p style={styles.bubbleText}>{msg.text}</p>
            </div>

            {/* Source Badges */}
            {msg.sources?.length > 0 && (
              <div style={styles.sourcesWrap}>
                {msg.sources.map((src, i) => (
                  <span key={i} className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                    <BookOpen size={11} />
                    {src.book_name}{src.page_number ? ` — Page ${src.page_number}` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="fade-in-up">
            <div style={styles.aiIcon}><Bot size={14} color="#60a5fa" /></div>
            <div style={{ ...styles.bubble('assistant'), padding: '0.625rem 1rem' }}>
              <div style={{ display: 'flex', gap: '5px' }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={styles.inputRow}>
        <textarea
          id="chat-input"
          style={styles.textarea}
          placeholder={subjectId ? 'Ask a question about your textbook...' : 'Select a subject to start chatting...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={!subjectId || loading}
        />
        <button
          id="chat-send-btn"
          className="btn-primary"
          onClick={sendMessage}
          disabled={!input.trim() || loading || !subjectId}
          style={{ padding: '0.625rem 1rem', minWidth: '48px', borderRadius: '10px' }}
        >
          <Send size={16} />
        </button>
      </div>
      <p style={styles.hint}>Press Enter to send · Shift+Enter for new line</p>
    </div>
  )
}

const styles = {
  panel: {
    display: 'flex', flexDirection: 'column', height: '100%',
    background: 'var(--bg-surface)', borderRadius: '16px',
    border: '1px solid var(--border)', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-card)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  aiIcon: {
    width: '34px', height: '34px', borderRadius: '10px',
    background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontWeight: '600', fontSize: '0.9rem' },
  headerSub: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  messages: {
    flex: 1, overflowY: 'auto', padding: '1.25rem',
    display: 'flex', flexDirection: 'column', gap: '1rem',
  },
  msgMeta: role => ({
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    fontSize: '0.72rem', color: 'var(--text-muted)',
    flexDirection: role === 'user' ? 'row-reverse' : 'row',
  }),
  bubble: role => ({
    maxWidth: '85%',
    padding: '0.75rem 1rem',
    borderRadius: role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
    background: role === 'user'
      ? 'linear-gradient(135deg, var(--accent), #6366f1)'
      : role === 'error'
        ? 'rgba(239,68,68,0.1)'
        : 'var(--bg-card)',
    border: `1px solid ${role === 'user' ? 'transparent' : role === 'error' ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
  }),
  bubbleText: {
    fontSize: '0.875rem', lineHeight: '1.6',
    whiteSpace: 'pre-wrap', color: 'var(--text-primary)',
  },
  sourcesWrap: { display: 'flex', flexWrap: 'wrap', gap: '0.375rem', maxWidth: '85%' },
  inputRow: {
    display: 'flex', gap: '0.625rem', padding: '1rem 1.25rem 0.5rem',
    borderTop: '1px solid var(--border)',
  },
  textarea: {
    flex: 1, padding: '0.625rem 0.875rem',
    background: 'var(--bg-base)', border: '1px solid var(--border)',
    borderRadius: '10px', color: 'var(--text-primary)',
    fontSize: '0.875rem', fontFamily: "'Inter', sans-serif",
    resize: 'none', outline: 'none', transition: 'border-color 0.2s',
    lineHeight: '1.5',
  },
  hint: { fontSize: '0.7rem', color: 'var(--text-muted)', paddingBottom: '0.75rem', textAlign: 'center' },
}
