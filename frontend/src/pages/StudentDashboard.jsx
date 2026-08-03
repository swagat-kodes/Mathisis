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
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  MessageCircle, Menu, History, X
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

  // Screen width detection for mobile/tablet vs desktop
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)

  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)
  const [historyOpen, setHistoryOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024
      setIsDesktop(desktop)
      if (desktop) {
        setSidebarOpen(true)
        setHistoryOpen(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
    if (!isDesktop) setHistoryOpen(false)
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
    if (!isDesktop) setHistoryOpen(false)
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

  const handleNavTabClick = (tab) => {
    setActiveTab(tab)
    if (!isDesktop) setSidebarOpen(false)
  }

  return (
    <div style={styles.appWrapper}>
      {/* Dynamic Backdrop Overlay for Mobile/Tablet Off-canvas drawers */}
      {!isDesktop && (sidebarOpen || historyOpen) && (
        <div
          className="mobile-overlay"
          onClick={() => {
            setSidebarOpen(false)
            setHistoryOpen(false)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
          }}
        />
      )}

      {/* Main 3-Column Layout */}
      <div style={styles.mainLayout}>

        {/* ── LEFT SIDEBAR (Inline on Desktop, Animated Drawer on Mobile/Tablet) ── */}
        <aside
          className={!isDesktop && sidebarOpen ? 'mobile-drawer-left' : ''}
          style={{
            ...styles.leftSidebar,
            position: isDesktop ? 'relative' : 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: isDesktop ? 1 : 50,
            width: isDesktop ? (sidebarOpen ? '275px' : '0px') : '290px',
            minWidth: isDesktop ? (sidebarOpen ? '275px' : '0px') : '290px',
            padding: (isDesktop ? sidebarOpen : true) ? '1.25rem 1rem' : '0px',
            borderRight: (isDesktop ? sidebarOpen : true) ? '1px solid var(--border-color)' : 'none',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: isDesktop ? (sidebarOpen ? 'flex' : 'none') : (sidebarOpen ? 'flex' : 'none'),
            transition: isDesktop ? 'all 0.25s ease' : 'none',
            boxShadow: (!isDesktop && sidebarOpen) ? '6px 0 28px rgba(0,0,0,0.6)' : 'none',
          }}
        >
          {/* Header & Logo (Fixed uncluttered layout so Admin badge and close button X never collide) */}
          <div style={styles.logoWrap}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
              <div style={styles.logoIcon}>
                <Sparkles size={20} color="#0B0C10" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
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

            {!isDesktop && (
              <button
                onClick={() => setSidebarOpen(false)}
                style={styles.closeBtnIcon}
                title="Close Navigation"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Nav List */}
          <div style={styles.navSection}>
            <span style={styles.sectionHeader}>TOOLS & NAVIGATION</span>

            <button
              onClick={() => handleNavTabClick('chat')}
              className="nav-item-btn"
              style={{
                ...(activeTab === 'chat' ? styles.navItemActive : {})
              }}
            >
              <Sparkles size={18} color={activeTab === 'chat' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              <span>Mathisis AI</span>
              {activeTab === 'chat' && <div style={styles.activeDot} />}
            </button>

            <button
              onClick={() => handleNavTabClick('forum')}
              className="nav-item-btn"
              style={{
                ...(activeTab === 'forum' ? styles.navItemActive : {})
              }}
            >
              <MessageSquare size={18} color={activeTab === 'forum' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              <span>Ask Q&A Forum</span>
            </button>

            <button
              onClick={() => handleNavTabClick('doc')}
              className="nav-item-btn"
              style={{
                ...(activeTab === 'doc' ? styles.navItemActive : {})
              }}
            >
              <FileText size={18} color={activeTab === 'doc' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              <span>Documentation</span>
            </button>

            <button
              onClick={() => handleNavTabClick('help')}
              className="nav-item-btn"
              style={{
                ...(activeTab === 'help' ? styles.navItemActive : {})
              }}
            >
              <HelpCircle size={18} color={activeTab === 'help' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              <span>Help Center</span>
            </button>

            <button
              onClick={() => handleNavTabClick('preferences')}
              className="nav-item-btn"
              style={{
                ...(activeTab === 'preferences' ? styles.navItemActive : {})
              }}
            >
              <Settings size={18} color={activeTab === 'preferences' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              <span>Preferences</span>
            </button>
          </div>

          {/* User Profile Card at Bottom */}
          <div className="user-card-hover" style={styles.userCard}>
            <div style={styles.userAvatar}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{user?.email?.split('@')[0]}</span>
              <span style={styles.userRole}>{isAdmin ? 'Administrator' : 'Student Account'}</span>
            </div>
            <button onClick={handleSignOut} title="Sign Out" className="icon-btn-hover" style={styles.logoutBtn}>
              <LogOut size={16} color="var(--text-muted)" />
            </button>
          </div>
        </aside>

        {/* ── CENTER CONTENT AREA ────────────────────────── */}
        <main style={styles.centerArea}>
          {/* Top Header Bar with Navigation & History Triggers */}
          <div style={styles.topControlBar}>
            <button
              onClick={() => {
                setSidebarOpen(!sidebarOpen)
                if (!isDesktop) setHistoryOpen(false)
              }}
              className="icon-btn-hover"
              style={styles.toggleMenuBtn}
              title={sidebarOpen ? 'Close Navigation' : 'Open Navigation'}
            >
              {isDesktop ? (
                sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />
              ) : (
                <Menu size={20} />
              )}
            </button>

            <span style={styles.topControlTitle}>
              {activeTab === 'chat' && 'Mathisis AI Chat'}
              {activeTab === 'forum' && 'Ask Q&A Forum'}
              {activeTab === 'doc' && 'Course Documentation'}
              {activeTab === 'help' && 'Help Center'}
              {activeTab === 'preferences' && 'Preferences & Settings'}
            </span>

            {/* Mobile / Tablet History Button */}
            {!isDesktop && (
              <button
                onClick={() => {
                  setHistoryOpen(!historyOpen)
                  setSidebarOpen(false)
                }}
                className="icon-btn-hover"
                style={{ ...styles.toggleMenuBtn, marginLeft: 'auto' }}
                title={historyOpen ? 'Close History' : 'Open History'}
              >
                <History size={20} />
              </button>
            )}
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

          {/* ── DEDICATED MOBILE BOTTOM NAVIGATION BAR ── */}
          {!isDesktop && (
            <div style={styles.mobileBottomNav}>
              <button
                onClick={() => setActiveTab('chat')}
                className="mobile-nav-btn"
                style={{
                  color: activeTab === 'chat' ? 'var(--accent-green)' : 'var(--text-muted)'
                }}
              >
                <Sparkles size={18} />
                <span style={styles.mobileNavLabel}>Chat</span>
              </button>

              <button
                onClick={() => setActiveTab('forum')}
                className="mobile-nav-btn"
                style={{
                  color: activeTab === 'forum' ? 'var(--accent-green)' : 'var(--text-muted)'
                }}
              >
                <MessageSquare size={18} />
                <span style={styles.mobileNavLabel}>Forum</span>
              </button>

              <button
                onClick={() => setActiveTab('doc')}
                className="mobile-nav-btn"
                style={{
                  color: activeTab === 'doc' ? 'var(--accent-green)' : 'var(--text-muted)'
                }}
              >
                <FileText size={18} />
                <span style={styles.mobileNavLabel}>Docs</span>
              </button>

              <button
                onClick={() => setActiveTab('help')}
                className="mobile-nav-btn"
                style={{
                  color: activeTab === 'help' ? 'var(--accent-green)' : 'var(--text-muted)'
                }}
              >
                <HelpCircle size={18} />
                <span style={styles.mobileNavLabel}>Help</span>
              </button>

              <button
                onClick={() => setSidebarOpen(true)}
                className="mobile-nav-btn"
                style={{
                  color: sidebarOpen ? 'var(--accent-green)' : 'var(--text-muted)'
                }}
              >
                <Menu size={18} />
                <span style={styles.mobileNavLabel}>Menu</span>
              </button>
            </div>
          )}
        </main>

        {/* ── RIGHT SIDEBAR: CHAT HISTORY (Inline on Desktop, Animated Drawer on Mobile/Tablet) ── */}
        <aside
          className={!isDesktop && historyOpen ? 'mobile-drawer-right' : ''}
          style={{
            ...styles.rightSidebar,
            position: isDesktop ? 'relative' : 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: isDesktop ? 1 : 50,
            width: isDesktop ? (historyOpen ? '280px' : '0px') : '290px',
            minWidth: isDesktop ? (historyOpen ? '280px' : '0px') : '290px',
            padding: (isDesktop ? historyOpen : true) ? '1.25rem 1rem' : '0px',
            borderLeft: (isDesktop ? historyOpen : true) ? '1px solid var(--border-color)' : 'none',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: isDesktop ? (historyOpen ? 'flex' : 'none') : (historyOpen ? 'flex' : 'none'),
            transition: isDesktop ? 'all 0.25s ease' : 'none',
            boxShadow: (!isDesktop && historyOpen) ? '-6px 0 28px rgba(0,0,0,0.6)' : 'none',
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
                className="icon-btn-hover"
                style={styles.closeBtnIcon}
                title="Close Chat History"
              >
                {isDesktop ? <PanelRightClose size={16} /> : <X size={18} />}
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
                  className="history-item-btn"
                  style={{
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
                    className="star-btn-hover"
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
    height: '100dvh',
    maxHeight: '100dvh',
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
    position: 'relative',
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
    justifyContent: 'space-between',
    gap: '0.75rem',
    marginBottom: '1.75rem',
    padding: '0 0.25rem',
    width: '100%',
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
    fontSize: '1.1rem',
    color: 'var(--text-primary)',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
  },
  brandSubtitle: {
    fontSize: '0.68rem',
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
    padding: '0.75rem 0.875rem',
    minHeight: '44px',
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
    minHeight: '44px',
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
    padding: '0.45rem',
    minHeight: '44px',
    minWidth: '44px',
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
    overflow: 'hidden',
  },
  topControlBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 1rem',
    minHeight: '52px',
    background: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border-color)',
    flexShrink: 0,
  },
  toggleMenuBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '0.5rem',
    minWidth: '44px',
    minHeight: '44px',
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
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  mobileBottomNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    background: 'var(--bg-panel)',
    borderTop: '1px solid var(--border-color)',
    padding: '0.35rem 0.5rem',
    minHeight: '56px',
    flexShrink: 0,
    zIndex: 20,
  },
  mobileNavItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    background: 'none',
    border: 'none',
    padding: '0.35rem 0.5rem',
    minWidth: '54px',
    cursor: 'pointer',
  },
  mobileNavLabel: {
    fontSize: '0.65rem',
    fontWeight: '600',
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
    padding: '0.35rem',
    minWidth: '36px',
    minHeight: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    flexShrink: 0,
  },
  newChatBtn: {
    width: '100%',
    padding: '0.75rem',
    minHeight: '44px',
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
    minHeight: '44px',
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
    padding: '0.35rem',
    minWidth: '32px',
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
