import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import ChatPanel from '../components/ChatPanel'
import ForumPanel from '../components/ForumPanel'
import DocumentationPanel from '../components/DocumentationPanel'
import HelpCenterPanel from '../components/HelpCenterPanel'
import PreferencesPanel from '../components/PreferencesPanel'
import {
  Sparkles, LogOut, Shield, MessageSquare,
  Plus, Star, Settings, FileText, HelpCircle,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, MessageCircle
} from 'lucide-react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function StudentDashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'admin'

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out successfully')
    navigate('/login', { replace: true })
  }

  const [years] = useState([1, 2, 3, 4])
  const semesters = { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8] }

  const [selectedYear, setSelectedYear] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('')
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)

  const [activeTab, setActiveTab] = useState('chat')

  // Default both sidebars to OPEN as requested
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(true)

  // Preferences State
  const [theme, setTheme] = useState(() => localStorage.getItem('mathisis_theme') || 'dark')
  const [answerStyle, setAnswerStyle] = useState(() => localStorage.getItem('mathisis_answer_style') || 'concise')

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Default to open "New Chat"
  const [chatHistory, setChatHistory] = useState([
    { id: 'chat-initial', title: 'New Conversation', time: 'Just now', active: true, starred: false }
  ])
  const [activeChatTitle, setActiveChatTitle] = useState('New Conversation')

  // Fetch subjects when semester changes
  useEffect(() => {
    if (!selectedYear || !selectedSemester) return
    fetch(`${API}/student/subjects?year=${selectedYear}&semester=${selectedSemester}`)
      .then(r => r.json())
      .then(data => {
        setSubjects(Array.isArray(data) ? data : [])
        setSelectedSubject(null)
      })
      .catch(() => setSubjects([]))
  }, [selectedYear, selectedSemester])

  const availableSemesters = selectedYear ? semesters[Number(selectedYear)] : []

  // Handle "+ New Chat"
  const handleNewChat = () => {
    const newId = 'chat-' + Date.now()
    const newTitle = `Conversation ${chatHistory.length + 1}`
    const newChatObj = { id: newId, title: newTitle, time: 'Just now', active: true, starred: false }

    setChatHistory(prev => [
      newChatObj,
      ...prev.map(item => ({ ...item, active: false }))
    ])
    setActiveChatTitle(newTitle)
    setActiveTab('chat')
  }

  // Handle selecting chat item
  const handleSelectHistoryItem = (selectedId, title) => {
    setChatHistory(prev =>
      prev.map(item => ({
        ...item,
        active: item.id === selectedId
      }))
    )
    setActiveChatTitle(title)
    setActiveTab('chat')
  }

  // Toggle star
  const handleToggleStar = (itemId, e) => {
    e.stopPropagation()
    setChatHistory(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, starred: !item.starred } : item
      )
    )
  }

  return (
    <div style={styles.appWrapper}>
      {/* Main 3-Column Container */}
      <div style={styles.mainLayout}>

        {/* ── LEFT SIDEBAR ─────────────────────────────────── */}
        <aside
          style={{
            ...styles.leftSidebar,
            width: sidebarOpen ? '275px' : '0px',
            minWidth: sidebarOpen ? '275px' : '0px',
            padding: sidebarOpen ? '1.25rem 1rem' : '0px',
            borderRight: sidebarOpen ? '1px solid var(--border-color)' : 'none',
            overflow: 'hidden',
            transition: 'all 0.25s ease'
          }}
        >
          {/* Logo & Title (Un-cramped Header) */}
          <div style={styles.logoWrap}>
            <div style={styles.logoIcon}>
              <Sparkles size={20} color="#0B0C10" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={styles.brandTitle}>Mathisis AI</span>
                {isAdmin && (
                  <span className="badge badge-green" style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem', flexShrink: 0 }}>
                    <Shield size={9} /> Admin
                  </span>
                )}
              </div>
              <span style={styles.brandSubtitle}>Engineering Companion</span>
            </div>
          </div>

          {/* Nav List */}
          <div style={styles.navSection}>
            <span style={styles.sectionHeader}>TOOLS & NAVIGATION</span>

            <button
              onClick={() => setActiveTab('chat')}
              style={{
                ...styles.navItem,
                ...(activeTab === 'chat' ? styles.navItemActive : {})
              }}
            >
              <Sparkles size={18} color={activeTab === 'chat' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              <span>Mathisis AI</span>
              {activeTab === 'chat' && <div style={styles.activeDot} />}
            </button>

            <button
              onClick={() => setActiveTab('forum')}
              style={{
                ...styles.navItem,
                ...(activeTab === 'forum' ? styles.navItemActive : {})
              }}
            >
              <MessageSquare size={18} color={activeTab === 'forum' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              <span>Ask Q&A Forum</span>
            </button>

            <button
              onClick={() => setActiveTab('doc')}
              style={{
                ...styles.navItem,
                ...(activeTab === 'doc' ? styles.navItemActive : {})
              }}
            >
              <FileText size={18} color={activeTab === 'doc' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              <span>Documentation</span>
            </button>

            <button
              onClick={() => setActiveTab('help')}
              style={{
                ...styles.navItem,
                ...(activeTab === 'help' ? styles.navItemActive : {})
              }}
            >
              <HelpCircle size={18} color={activeTab === 'help' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              <span>Help Center</span>
            </button>

            <button
              onClick={() => setActiveTab('preferences')}
              style={{
                ...styles.navItem,
                ...(activeTab === 'preferences' ? styles.navItemActive : {})
              }}
            >
              <Settings size={18} color={activeTab === 'preferences' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              <span>Preferences</span>
            </button>
          </div>

          {/* User Profile Card at Bottom */}
          <div style={styles.userCard}>
            <div style={styles.userAvatar}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{user?.email?.split('@')[0]}</span>
              <span style={styles.userRole}>{isAdmin ? 'Administrator' : 'Student Account'}</span>
            </div>
            <button onClick={handleSignOut} title="Sign Out" style={styles.logoutBtn}>
              <LogOut size={16} color="var(--text-muted)" />
            </button>
          </div>
        </aside>

        {/* ── CENTER CONTENT AREA ────────────────────────── */}
        <main style={styles.centerArea}>
          {/* Top Header Bar with Menu Button */}
          <div style={styles.topControlBar}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={styles.toggleMenuBtn}
              title={sidebarOpen ? 'Close Left Navigation' : 'Open Left Navigation'}
            >
              {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
            <span style={styles.topControlTitle}>
              {activeTab === 'chat' && 'Mathisis AI Chat'}
              {activeTab === 'forum' && 'Ask Q&A Forum'}
              {activeTab === 'doc' && 'Course Documentation'}
              {activeTab === 'help' && 'Help Center'}
              {activeTab === 'preferences' && 'Preferences & Settings'}
            </span>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'chat' && (
              <ChatPanel
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                selectedSemester={selectedSemester}
                setSelectedSemester={setSelectedSemester}
                years={years}
                availableSemesters={availableSemesters}
                subjects={subjects}
                setSubjects={setSubjects}
                selectedSubject={selectedSubject}
                setSelectedSubject={setSelectedSubject}
                activeChatTitle={activeChatTitle}
                historyOpen={historyOpen}
                setHistoryOpen={setHistoryOpen}
                answerStyle={answerStyle}
              />
            )}
            {activeTab === 'forum' && <ForumPanel subjectId={selectedSubject?.id} />}
            {activeTab === 'doc' && (
              <DocumentationPanel
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                selectedSemester={selectedSemester}
                setSelectedSemester={setSelectedSemester}
                years={years}
                availableSemesters={availableSemesters}
                subjects={subjects}
                selectedSubject={selectedSubject}
                setSelectedSubject={setSelectedSubject}
              />
            )}
            {activeTab === 'help' && <HelpCenterPanel />}
            {activeTab === 'preferences' && (
              <PreferencesPanel
                theme={theme}
                setTheme={setTheme}
                answerStyle={answerStyle}
                setAnswerStyle={setAnswerStyle}
              />
            )}
          </div>
        </main>

        {/* ── RIGHT SIDEBAR: CHAT HISTORY ─────────────────── */}
        <aside
          style={{
            ...styles.rightSidebar,
            width: historyOpen ? '280px' : '0px',
            minWidth: historyOpen ? '280px' : '0px',
            padding: historyOpen ? '1.25rem 1rem' : '0px',
            borderLeft: historyOpen ? '1px solid var(--border-color)' : 'none',
            overflow: 'hidden',
            transition: 'all 0.25s ease'
          }}
        >
          {/* Header & "+ New Chat" Button */}
          <div style={styles.historyHeader}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Chat History
              </span>
              <button
                onClick={() => setHistoryOpen(false)}
                style={styles.closeBtnIcon}
                title="Close Chat History"
              >
                <PanelRightClose size={16} />
              </button>
            </div>
            <button
              id="new-chat-btn"
              className="btn-primary"
              onClick={handleNewChat}
              style={styles.newChatBtn}
            >
              <Plus size={18} /> + New Chat
            </button>
          </div>

          {/* Chat History List */}
          <div style={styles.historyList}>
            {chatHistory.length === 0 ? (
              <div style={styles.emptyHistory}>
                <MessageCircle size={32} color="var(--text-muted)" />
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
                  No previous conversations yet. Click "+ New Chat" to start!
                </p>
              </div>
            ) : (
              chatHistory.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleSelectHistoryItem(item.id, item.title)}
                  style={{
                    ...styles.historyItem,
                    ...(item.active ? styles.historyItemActive : {})
                  }}
                >
                  <MessageSquare size={15} color={item.active ? 'var(--accent-green)' : 'var(--text-muted)'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.itemTitle}>{item.title}</p>
                    <span style={styles.itemTime}>{item.time}</span>
                  </div>
                  <button
                    onClick={e => handleToggleStar(item.id, e)}
                    style={styles.starBtn}
                    title="Favorite chat"
                  >
                    <Star
                      size={14}
                      color={item.starred ? 'var(--accent-gold)' : 'var(--text-muted)'}
                      fill={item.starred ? 'var(--accent-gold)' : 'transparent'}
                    />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

const styles = {
  appWrapper: {
    height: '100vh',
    maxHeight: '100vh',
    width: '100vw',
    maxWidth: '100vw',
    background: 'var(--bg-main)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  mainLayout: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  /* Left Sidebar */
  leftSidebar: {
    background: 'var(--bg-panel)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    flexShrink: 0,
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.75rem',
    padding: '0 0.25rem',
  },
  logoIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    background: 'var(--accent-green)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 16px var(--shadow-glow)',
    flexShrink: 0,
  },
  brandTitle: {
    fontFamily: "'Verdana', 'Geneva', sans-serif",
    fontWeight: '800',
    fontSize: '1.15rem',
    color: 'var(--text-primary)',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
  },
  brandSubtitle: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  navSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  sectionHeader: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
    paddingLeft: '0.5rem',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.65rem 0.875rem',
    borderRadius: '12px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontWeight: '600',
    fontFamily: "'Verdana', 'Geneva', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    textAlign: 'left',
    width: '100%',
  },
  navItemActive: {
    background: 'var(--bg-hover)',
    color: 'var(--text-primary)',
  },
  activeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--accent-green)',
    marginLeft: 'auto',
    boxShadow: '0 0 8px var(--accent-green)',
  },
  userCard: {
    marginTop: 'auto',
    padding: '0.75rem 0.875rem',
    borderRadius: '14px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  userAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    background: 'var(--bg-hover)',
    color: 'var(--accent-green)',
    fontWeight: '700',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(43, 242, 160, 0.3)',
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.35rem',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },
  /* Center Area */
  centerArea: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-panel)',
  },
  topControlBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 1.25rem',
    background: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border-color)',
  },
  toggleMenuBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '0.45rem',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  topControlTitle: {
    fontWeight: '700',
    fontSize: '0.92rem',
    color: 'var(--text-primary)',
  },
  /* Right Sidebar */
  rightSidebar: {
    background: 'var(--bg-panel)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    flexShrink: 0,
  },
  historyHeader: {
    marginBottom: '1rem',
  },
  closeBtnIcon: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '2px',
  },
  newChatBtn: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '14px',
    fontSize: '0.9rem',
    fontWeight: '700',
  },
  historyList: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  emptyHistory: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1rem',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.65rem 0.75rem',
    borderRadius: '12px',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
  },
  historyItemActive: {
    background: 'var(--bg-hover)',
    borderColor: 'var(--border-color)',
  },
  itemTitle: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemTime: {
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    display: 'block',
    marginTop: '1px',
  },
  starBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
