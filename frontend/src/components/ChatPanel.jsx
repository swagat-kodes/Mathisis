import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
  Send, BookOpen, Sparkles, User, AlertCircle,
  ChevronDown, PanelRightClose, PanelRightOpen
} from 'lucide-react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function ChatPanel({
  selectedYear, setSelectedYear,
  selectedSemester, setSelectedSemester,
  years, availableSemesters,
  subjects, selectedSubject, setSelectedSubject, setSubjects,
  activeChatTitle,
  historyOpen, setHistoryOpen,
  answerStyle
}) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    {
      id: 'welcome-initial',
      role: 'assistant',
      text: "👋 Hi! I'm Mathisis AI. Select a subject to get started.",
      sources: [],
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Change message when subject changes
  useEffect(() => {
    if (selectedSubject) {
      setMessages([
        {
          id: 'welcome-' + selectedSubject.id,
          role: 'assistant',
          text: `📚 Ready to study **${selectedSubject.subject_name}**! Ask me any concept, formula, or exam question, and I'll retrieve answers directly from your course materials.`,
          sources: [],
        }
      ])
    } else {
      setMessages([
        {
          id: 'welcome-initial',
          role: 'assistant',
          text: "👋 Hi! I'm Mathisis AI. Select a subject to get started.",
          sources: [],
        }
      ])
    }
  }, [selectedSubject?.id])

  // Load chat topic from history
  useEffect(() => {
    if (activeChatTitle && activeChatTitle !== 'New Conversation' && activeChatTitle !== 'Default') {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          text: `Loaded topic: **${activeChatTitle}**. What would you like to explore regarding this topic?`,
          sources: []
        }
      ])
    }
  }, [activeChatTitle])

  const sendMessage = async () => {
    if (!input.trim() || loading || !selectedSubject?.id) return

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
        body: JSON.stringify({
          subject_id: selectedSubject.id,
          query: input,
          answer_style: answerStyle || 'concise'
        }),
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
      {/* 1. Header (Subject Selectors & Right Sidebar Toggle) */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.aiLogoIcon}>
            <Sparkles size={20} color="#0B0C10" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={styles.headerTitle}>Mathisis AI</h2>
              <span className="badge badge-green">
                <Sparkles size={10} /> {answerStyle === 'detailed' ? 'Detailed Mode' : 'Concise Mode'}
              </span>
            </div>
            <p style={styles.headerSub}>
              {selectedSubject ? `Active: ${selectedSubject.subject_name}` : 'Select your Year, Semester & Subject to start'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          {/* Inline Filters */}
          <div style={styles.filterGroup}>
            <select
              id="chat-year-select"
              className="select-field"
              value={selectedYear}
              onChange={e => {
                setSelectedYear(e.target.value)
                setSelectedSemester('')
                setSubjects([])
                setSelectedSubject(null)
              }}
              style={styles.selectInput}
            >
              <option value="">Year</option>
              {years?.map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>

            <select
              id="chat-sem-select"
              className="select-field"
              value={selectedSemester}
              onChange={e => {
                setSelectedSemester(e.target.value)
                setSelectedSubject(null)
              }}
              disabled={!selectedYear}
              style={styles.selectInput}
            >
              <option value="">Semester</option>
              {availableSemesters?.map(s => <option key={s} value={s}>Sem {s}</option>)}
            </select>

            <select
              id="chat-subject-select"
              className="select-field"
              value={selectedSubject?.id || ''}
              onChange={e => {
                const sub = subjects.find(s => s.id === e.target.value)
                setSelectedSubject(sub || null)
              }}
              disabled={!selectedSemester || subjects.length === 0}
              style={{ ...styles.selectInput, minWidth: '150px' }}
            >
              <option value="">{subjects.length ? 'Subject...' : 'No subject'}</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
          </div>

          {/* Top Right Toggle Button for Right Sidebar */}
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            style={styles.historyToggleBtn}
            title={historyOpen ? 'Close Chat History' : 'Open Chat History'}
          >
            {historyOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
        </div>
      </div>

      {/* 2. Messages Container */}
      <div style={styles.messagesContainer}>
        {messages.map(msg => (
          <div
            key={msg.id}
            className="fade-in-up"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap: '0.4rem',
            }}
          >
            {/* Meta */}
            <div style={styles.msgMeta(msg.role)}>
              {msg.role !== 'user' && (msg.role === 'error' ? <AlertCircle size={13} /> : <Sparkles size={13} color="var(--accent-green)" />)}
              <span>{msg.role === 'user' ? 'You' : msg.role === 'error' ? 'System Error' : 'Mathisis AI'}</span>
              {msg.role === 'user' && <User size={13} />}
            </div>

            {/* Bubble */}
            <div style={styles.bubble(msg.role)}>
              <p style={styles.bubbleText}>{msg.text}</p>
            </div>

            {/* Citations */}
            {msg.sources?.length > 0 && (
              <div style={styles.sourcesWrap}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Sources:</span>
                {msg.sources.map((src, i) => (
                  <span key={i} className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                    <BookOpen size={11} />
                    {src.book_name}{src.page_number ? ` (p. ${src.page_number})` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="fade-in-up">
            <div style={styles.aiAvatarMini}><Sparkles size={14} color="var(--accent-green)" /></div>
            <div style={{ ...styles.bubble('assistant'), padding: '0.625rem 1rem' }}>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Pinned Input Bar */}
      <div style={styles.inputBarContainer}>
        <div style={styles.inputRow}>
          <textarea
            id="chat-input"
            style={styles.textarea}
            placeholder={
              selectedSubject
                ? `Ask Mathisis AI anything about ${selectedSubject.subject_name}...`
                : 'Select your subject first to ask Mathisis AI...'
            }
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={!selectedSubject?.id || loading}
          />
          <button
            id="chat-send-btn"
            className="btn-primary"
            onClick={sendMessage}
            disabled={!input.trim() || loading || !selectedSubject?.id}
            style={styles.sendBtn}
          >
            <Send size={18} />
          </button>
        </div>
        <p style={styles.inputHint}>
          Press <kbd style={styles.kbd}>Enter</kbd> to send · <kbd style={styles.kbd}>Shift + Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    height: '100%',
    minHeight: 0,
    background: 'var(--bg-panel)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.875rem 1.25rem',
    borderBottom: '1px solid var(--border-color)',
    background: 'var(--bg-panel)',
    flexShrink: 0,
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  aiLogoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'var(--accent-green)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 12px var(--shadow-glow)',
  },
  headerTitle: {
    fontWeight: '700',
    fontSize: '1rem',
    color: 'var(--text-primary)',
  },
  headerSub: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  selectInput: {
    minWidth: '95px',
    padding: '0.4rem 1.75rem 0.4rem 0.75rem',
    fontSize: '0.78rem',
  },
  historyToggleBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '0.5rem',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  messagesContainer: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    background: 'var(--bg-panel)',
  },
  msgMeta: role => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    flexDirection: role === 'user' ? 'row-reverse' : 'row',
  }),
  bubble: role => ({
    maxWidth: '82%',
    padding: '0.875rem 1.125rem',
    borderRadius: '16px',
    background: role === 'user' ? 'var(--bg-card)' : role === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-card)',
    border: `1px solid ${
      role === 'user' ? 'var(--accent-green)' : role === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'
    }`,
    boxShadow: role === 'user' ? '0 2px 8px var(--shadow-glow)' : 'none',
  }),
  bubbleText: {
    fontSize: '0.9rem',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    color: 'var(--text-primary)',
  },
  sourcesWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
    maxWidth: '82%',
  },
  aiAvatarMini: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBarContainer: {
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem 1.25rem 0.75rem',
    borderTop: '1px solid var(--border-color)',
    background: 'var(--bg-panel)',
    flexShrink: 0,
  },
  inputRow: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  textarea: {
    flex: 1,
    padding: '0.75rem 1rem',
    background: 'var(--bg-card)',
    border: '1.5px solid var(--border-color)',
    borderRadius: '14px',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    fontFamily: "'Helvetica', 'Arial', sans-serif",
    resize: 'none',
    outline: 'none',
    transition: 'border-color 0.2s',
    lineHeight: '1.5',
  },
  sendBtn: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    padding: 0,
    flexShrink: 0,
  },
  inputHint: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    marginTop: '0.5rem',
    textAlign: 'center',
  },
  kbd: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    padding: '1px 5px',
    fontSize: '0.68rem',
    color: 'var(--text-primary)',
  },
}
