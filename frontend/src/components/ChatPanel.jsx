import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
  Send, BookOpen, Sparkles, User, AlertCircle,
  PanelRightClose, PanelRightOpen, Paperclip, X, Image as ImageIcon
} from 'lucide-react'

const API = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')

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
  const [attachedImage, setAttachedImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleImageSelect = (file) => {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      alert('Please select a valid image file (PNG, JPEG, or WebP).')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setAttachedImage({
        file,
        previewUrl: e.target.result,
        base64: e.target.result
      })
    }
    reader.readAsDataURL(file)
  }

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
    if ((!input.trim() && !attachedImage) || loading || !selectedSubject?.id) return

    const userQuery = input.trim() || 'Analyze the attached image.'
    const userImg = attachedImage?.previewUrl || null
    const userImgBase64 = attachedImage?.base64 || null

    const userMsg = { id: Date.now(), role: 'user', text: input, image: userImg }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setAttachedImage(null)
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
          query: userQuery,
          answer_style: answerStyle || 'detailed',
          image_data: userImgBase64,
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
      {/* 1. Header (Subject Selectors & Desktop History Toggle) */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.aiLogoIcon}>
            <Sparkles size={18} color="#0B0C10" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <h2 style={styles.headerTitle}>Mathisis AI</h2>
              <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                <Sparkles size={9} /> {answerStyle === 'concise' ? 'Concise Mode' : 'Detailed Mode'}
              </span>
            </div>
            <p style={styles.headerSub}>
              {selectedSubject ? `Active: ${selectedSubject.subject_name}` : 'Select Year, Semester & Subject'}
            </p>
          </div>
        </div>

        <div style={styles.headerFiltersRow}>
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
              style={styles.selectInputShort}
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
              style={styles.selectInputShort}
            >
              <option value="">Sem</option>
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
              style={styles.selectInputLong}
            >
              <option value="">{subjects.length ? 'Select Subject...' : 'No subject'}</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
          </div>

          {/* Desktop Toggle Button for Right Sidebar */}
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            style={styles.historyToggleBtn}
            title={historyOpen ? 'Close Chat History' : 'Open Chat History'}
            className="hidden lg:flex"
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
              gap: '0.35rem',
            }}
          >
            {/* Meta */}
            <div style={styles.msgMeta(msg.role)}>
              {msg.role !== 'user' && (msg.role === 'error' ? <AlertCircle size={12} /> : <Sparkles size={12} color="var(--accent-green)" />)}
              <span>{msg.role === 'user' ? 'You' : msg.role === 'error' ? 'System Error' : 'Mathisis AI'}</span>
              {msg.role === 'user' && <User size={12} />}
            </div>

            {/* Bubble */}
            <div style={styles.bubble(msg.role)}>
              {msg.image && (
                <img
                  src={msg.image}
                  alt="Attached content"
                  style={styles.messageImage}
                />
              )}
              {msg.text && <p style={styles.bubbleText}>{msg.text}</p>}
            </div>

            {/* Citations */}
            {msg.sources?.length > 0 && (
              <div style={styles.sourcesWrap}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Sources:</span>
                {msg.sources.map((src, i) => (
                  <span key={i} className="badge badge-green" style={{ fontSize: '0.68rem' }}>
                    <BookOpen size={10} />
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
            <div style={styles.aiAvatarMini}><Sparkles size={13} color="var(--accent-green)" /></div>
            <div style={{ ...styles.bubble('assistant'), padding: '0.625rem 0.875rem' }}>
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
      <div
        style={styles.inputBarContainer}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          if (e.dataTransfer.files?.[0]) handleImageSelect(e.dataTransfer.files[0])
        }}
      >
        {attachedImage && (
          <div style={styles.imagePreviewRow}>
            <div style={styles.previewBox}>
              <img src={attachedImage.previewUrl} alt="Preview" style={styles.previewThumb} />
              <span style={styles.previewName}>{attachedImage.file.name}</span>
              <button
                onClick={() => setAttachedImage(null)}
                style={styles.removeImgBtn}
                title="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div style={styles.inputRow}>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png, image/jpeg, image/webp"
            style={{ display: 'none' }}
            onChange={e => {
              if (e.target.files?.[0]) handleImageSelect(e.target.files[0])
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedSubject?.id || loading}
            style={styles.attachBtn}
            title="Attach Image (PNG, JPEG, WebP)"
            className="icon-btn-hover"
          >
            <Paperclip size={18} />
          </button>
          <textarea
            id="chat-input"
            style={styles.textarea}
            placeholder={
              selectedSubject
                ? `Ask Mathisis AI about ${selectedSubject.subject_name}...`
                : 'Select your subject above first...'
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
            disabled={(!input.trim() && !attachedImage) || loading || !selectedSubject?.id}
            style={styles.sendBtn}
            title="Send Message"
          >
            <Send size={18} />
          </button>
        </div>
        <p style={styles.inputHint}>
          Press <kbd style={styles.kbd}>Enter</kbd> to send · <kbd style={styles.kbd}>Shift + Enter</kbd> for new line · Drag & drop or attach image
        </p>
      </div>
    </div>
  )
}

const styles = {
  attachBtn: {
    background: 'var(--bg-card)',
    border: '1.5px solid var(--border-color)',
    borderRadius: '12px',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
  imagePreviewRow: {
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
  },
  previewBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '0.35rem 0.6rem',
    maxWidth: '100%',
  },
  previewThumb: {
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    objectFit: 'cover',
  },
  previewName: {
    fontSize: '0.78rem',
    color: 'var(--text-primary)',
    fontWeight: '600',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '160px',
  },
  removeImgBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px',
    borderRadius: '4px',
  },
  messageImage: {
    maxWidth: '240px',
    maxHeight: '200px',
    borderRadius: '10px',
    marginBottom: '0.4rem',
    display: 'block',
    objectFit: 'contain',
    border: '1px solid var(--border-color)',
  },
  panel: {

    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    height: '100%',
    minHeight: 0,
    background: 'var(--bg-panel)',
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border-color)',
    background: 'var(--bg-panel)',
    flexShrink: 0,
    gap: '0.625rem',
    flexWrap: 'wrap',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    minWidth: 0,
  },
  aiLogoIcon: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    background: 'var(--accent-green)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 12px var(--shadow-glow)',
    flexShrink: 0,
  },
  headerTitle: {
    fontWeight: '700',
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
  },
  headerSub: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headerFiltersRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    flexWrap: 'wrap',
  },
  selectInputShort: {
    minWidth: '80px',
    maxWidth: '100px',
    padding: '0.4rem 1.6rem 0.4rem 0.6rem',
    fontSize: '0.78rem',
    minHeight: '40px',
  },
  selectInputLong: {
    minWidth: '130px',
    maxWidth: '200px',
    padding: '0.4rem 1.6rem 0.4rem 0.6rem',
    fontSize: '0.78rem',
    minHeight: '40px',
  },
  historyToggleBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '0.45rem',
    minWidth: '40px',
    minHeight: '40px',
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
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
    background: 'var(--bg-panel)',
  },
  msgMeta: role => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    flexDirection: role === 'user' ? 'row-reverse' : 'row',
  }),
  bubble: role => ({
    maxWidth: '88%',
    padding: '0.75rem 1rem',
    borderRadius: '16px',
    background: role === 'user' ? 'var(--bg-card)' : role === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-card)',
    border: `1px solid ${
      role === 'user' ? 'var(--accent-green)' : role === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'
    }`,
    boxShadow: role === 'user' ? '0 2px 8px var(--shadow-glow)' : 'none',
  }),
  bubbleText: {
    fontSize: '0.86rem',
    lineHeight: '1.55',
    whiteSpace: 'pre-wrap',
    color: 'var(--text-primary)',
    wordBreak: 'break-word',
  },
  sourcesWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
    maxWidth: '88%',
  },
  aiAvatarMini: {
    width: '26px',
    height: '26px',
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
    padding: '0.75rem 1rem 0.625rem',
    borderTop: '1px solid var(--border-color)',
    background: 'var(--bg-panel)',
    flexShrink: 0,
  },
  inputRow: {
    display: 'flex',
    gap: '0.625rem',
    alignItems: 'center',
  },
  textarea: {
    flex: 1,
    padding: '0.65rem 0.875rem',
    minHeight: '44px',
    maxHeight: '120px',
    background: 'var(--bg-card)',
    border: '1.5px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    fontFamily: "'Helvetica', 'Arial', sans-serif",
    resize: 'none',
    outline: 'none',
    transition: 'border-color 0.2s',
    lineHeight: '1.45',
  },
  sendBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    padding: 0,
    flexShrink: 0,
  },
  inputHint: {
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    marginTop: '0.375rem',
    textAlign: 'center',
  },
  kbd: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    padding: '1px 4px',
    fontSize: '0.65rem',
    color: 'var(--text-primary)',
  },
}
