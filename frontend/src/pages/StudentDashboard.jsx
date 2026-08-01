import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import ChatPanel from '../components/ChatPanel'
import ForumPanel from '../components/ForumPanel'
import {
  BookOpen, ChevronDown, LogOut, GraduationCap,
  User, MessageSquare, Sparkles, Shield
} from 'lucide-react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function StudentDashboard() {
  const { user, profile, signOut } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [years] = useState([1, 2, 3, 4])
  const semesters = { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8] }

  const [selectedYear, setSelectedYear] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('')
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null) // {id, subject_name}

  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'forum' on mobile

  // Fetch subjects when semester changes (public endpoint, no auth needed)
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

  return (
    <div style={{ height: '100vh', maxHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={styles.navLogo}><BookOpen size={20} color="#60a5fa" /></div>
          <span style={styles.navTitle} className="gradient-text">Mathisis</span>
          {isAdmin && (
            <span className="badge badge-blue" style={{ marginLeft: '0.25rem' }}>
              <Shield size={10} /> Admin
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <User size={13} style={{ display: 'inline', marginRight: '0.35rem' }} />
            {user?.email}
          </span>
          <button className="btn-secondary" onClick={signOut}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </nav>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.filterInner}>
          <div style={styles.filterLabel}><GraduationCap size={15} /> Select your subject:</div>

          {/* Year */}
          <div style={styles.selectWrap}>
            <select id="year-filter" className="select-field" style={{ minWidth: '130px' }}
              value={selectedYear}
              onChange={e => { setSelectedYear(e.target.value); setSelectedSemester(''); setSubjects([]); setSelectedSubject(null) }}>
              <option value="">Select Year</option>
              {years.map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
            <ChevronDown size={13} style={styles.chevron} />
          </div>

          {/* Semester */}
          <div style={styles.selectWrap}>
            <select id="semester-filter" className="select-field" style={{ minWidth: '150px' }}
              value={selectedSemester}
              onChange={e => { setSelectedSemester(e.target.value); setSelectedSubject(null) }}
              disabled={!selectedYear}>
              <option value="">Select Semester</option>
              {availableSemesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <ChevronDown size={13} style={styles.chevron} />
          </div>

          {/* Subject */}
          <div style={styles.selectWrap}>
            <select id="subject-filter" className="select-field" style={{ minWidth: '200px' }}
              value={selectedSubject?.id || ''}
              onChange={e => {
                const sub = subjects.find(s => s.id === e.target.value)
                setSelectedSubject(sub || null)
              }}
              disabled={!selectedSemester || subjects.length === 0}>
              <option value="">{subjects.length ? 'Select Subject' : 'No subjects found'}</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
            <ChevronDown size={13} style={styles.chevron} />
          </div>

          {selectedSubject && (
            <span className="badge badge-green fade-in-up">
              <Sparkles size={11} /> {selectedSubject.subject_name}
            </span>
          )}
        </div>
      </div>

      {/* Mobile tab switcher */}
      <div style={styles.mobileTabs}>
        <button onClick={() => setActiveTab('chat')}
          style={{ ...styles.mobileTab, ...(activeTab === 'chat' ? styles.mobileTabActive : {}) }}>
          <Sparkles size={14} /> AI Chat
        </button>
        <button onClick={() => setActiveTab('forum')}
          style={{ ...styles.mobileTab, ...(activeTab === 'forum' ? styles.mobileTabActive : {}) }}>
          <MessageSquare size={14} /> Forum
        </button>
      </div>

      {/* Main content */}
      <div style={styles.content}>
        <div style={{ ...styles.chatCol, display: activeTab === 'forum' ? 'none' : 'flex' }} className="desktop-flex">
          <ChatPanel subjectId={selectedSubject?.id} />
        </div>
        <div style={{ ...styles.forumCol, display: activeTab === 'chat' ? 'none' : 'flex' }} className="desktop-flex">
          <ForumPanel subjectId={selectedSubject?.id} />
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .desktop-flex { display: flex !important; }
          #mobile-tabs { display: none !important; }
        }
      `}</style>
    </div>
  )
}

const styles = {
  navLogo: { width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: "'Outfit', sans-serif", fontSize: '1.4rem', fontWeight: '800' },
  filterBar: { background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', padding: '0.875rem 1.5rem' },
  filterInner: { maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' },
  filterLabel: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)', marginRight: '0.25rem' },
  selectWrap: { position: 'relative' },
  chevron: { position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' },
  mobileTabs: { display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' },
  mobileTab: { flex: 1, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s', borderBottom: '2px solid transparent' },
  mobileTabActive: { color: 'var(--accent)', borderBottom: '2px solid var(--accent)', background: 'rgba(59,130,246,0.05)' },
  content: { flex: 1, minHeight: 0, display: 'flex', gap: '1rem', padding: '1rem 1.5rem', maxWidth: '1400px', width: '100%', margin: '0 auto', height: 'calc(100vh - 162px)', maxHeight: 'calc(100vh - 162px)', overflow: 'hidden' },
  chatCol: { flex: '1.2', minWidth: 0, height: '100%', maxHeight: '100%', minHeight: 0, flexDirection: 'column' },
  forumCol: { flex: '1', minWidth: 0, height: '100%', maxHeight: '100%', minHeight: 0, flexDirection: 'column' },
}
