import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'
import {
  Send, BookOpen, Sparkles, User, AlertCircle,
  Paperclip, X, PanelRightClose, PanelRightOpen
} from 'lucide-react'

const API = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')

export default function ChatPanel({
  selectedSubject,
  activeChatTitle,
  historyOpen, setHistoryOpen,
  answerStyle
}) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    {
      id: 'welcome-initial',
      role: 'assistant',
      text: "👋 Hi! I'm Mathisis AI. Ask me any engineering question, formula, or attach an image to analyze!",
      sources: [],
    }
  ])
  const [input, setInput] = useState('')
  const [attachedImage, setAttachedImage] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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

  const processImageFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPEG, WebP)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setAttachedImage({
        file,
        name: file.name,
        base64: e.target.result
      })
      toast.success('Image attached!')
    }
    reader.readAsDataURL(file)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) processImageFile(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processImageFile(file)
  }

  const sendMessage = async () => {
    if ((!input.trim() && !attachedImage) || loading) return

    const currentText = input.trim()
    const currentImg = attachedImage

    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: currentText,
      image: currentImg ? currentImg.base64 : null
    }

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
          subject_id: selectedSubject?.id || null,
          query: currentText || 'Please analyze this image.',
          image: currentImg ? currentImg.base64 : null,
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
      {/* 1. Header (Mode Indicator & History Toggle) */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.aiLogoIcon}>
            <Sparkles size={18} color="#0B0C10" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <h2 style={styles.headerTitle}>Mathisis AI Companion</h2>
              <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                <Sparkles size={9} /> {answerStyle === 'detailed' ? 'Detailed Mode' : 'Concise Mode'}
              </span>
            </div>
            <p style={styles.headerSub}>
              RAG-Powered Engineering Companion & Vision Multimodal AI
            </p>
          </div>
        </div>

        <div style={styles.headerFiltersRow}>
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
                  alt="User attached image"
                  style={{
                    maxWidth: '220px',
                    maxHeight: '180px',
                    borderRadius: '10px',
                    objectFit: 'cover',
                    marginBottom: msg.text ? '0.5rem' : '0',
                    display: 'block',
                    border: '1px solid var(--border-color)'
                  }}
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

      {/* 3. Pinned Input Bar with Drag & Drop and Image Preview */}
      <div
        style={{
          ...styles.inputBarContainer,
          border: isDragging ? '2px dashed var(--accent-green)' : '1px solid var(--border-color)'
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Attached Image Thumbnail Preview */}
        {attachedImage && (
          <div style={styles.previewContainer}>
            <div style={styles.previewBox}>
              <img src={attachedImage.base64} alt="Preview" style={styles.previewThumb} />
              <span style={styles.previewName}>{attachedImage.name}</span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                style={styles.removeImageBtn}
                title="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div style={styles.inputRow}>
          <button
            type="button"
            className="icon-btn-hover"
            onClick={() => fileInputRef.current?.click()}
            style={styles.attachBtn}
            title="Attach Image (PNG, JPEG, WebP)"
          >
            <Paperclip size={18} color={attachedImage ? 'var(--accent-green)' : 'var(--text-muted)'} />
          </button>

          <textarea
            id="chat-input"
            style={styles.textarea}
            placeholder="Ask Mathisis AI a question or drag & drop an image..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />

          <button
            id="chat-send-btn"
            className="btn-primary"
            onClick={sendMessage}
            disabled={(!input.trim() && !attachedImage) || loading}
            style={styles.sendBtn}
            title="Send Message"
          >
            <Send size={18} />
          </button>
        </div>

        <p style={styles.inputHint}>
          Press <kbd style={styles.kbd}>Enter</kbd> to send · <kbd style={styles.kbd}>Shift + Enter</kbd> for new line · Attach images for vision AI
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
    transition: 'border-color 0.2s',
  },
  previewContainer: {
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
  },
  previewBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.35rem 0.6rem',
    borderRadius: '10px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
  },
  previewThumb: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    objectFit: 'cover',
  },
  previewName: {
    fontSize: '0.78rem',
    color: 'var(--text-primary)',
    maxWidth: '160px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  removeImageBtn: {
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
  inputRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  attachBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
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
