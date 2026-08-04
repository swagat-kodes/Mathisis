import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'
import ForumPanel from '../components/ForumPanel'
import HelpCenterPanel from '../components/HelpCenterPanel'
import PreferencesPanel from '../components/PreferencesPanel'
import {
  Sparkles, UploadCloud, BookOpen, Plus, Shield, LogOut,
  MessageSquare, HelpCircle, Settings,
  AlertCircle, FileText, PanelLeftClose, PanelLeftOpen,
  Menu, X, Trash2, AlertTriangle
} from 'lucide-react'

const API = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('upload') // 'upload' | 'forum' | 'help' | 'preferences'

  // Screen width detection for mobile/tablet vs desktop
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024
      setIsDesktop(desktop)
      if (desktop) {
        setSidebarOpen(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Preferences State
  const [theme, setTheme] = useState(() => localStorage.getItem('mathisis_theme') || 'dark')
  const [answerStyle, setAnswerStyle] = useState(() => localStorage.getItem('mathisis_answer_style') || 'detailed')

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Admin Data State
  const [years] = useState([1, 2, 3, 4])
  const semesters = { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8] }

  const [selectedYear, setSelectedYear] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('')
  const [subjects, setSubjects] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState('')

  const [newSubjectName, setNewSubjectName] = useState('')
  const [creatingSubject, setCreatingSubject] = useState(false)

  const [subjectToDelete, setSubjectToDelete] = useState(null)
  const [deletingSubject, setDeletingSubject] = useState(false)

  const [pdfFile, setPdfFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  // Fetch subjects when year and semester change
  useEffect(() => {
    if (!selectedYear || !selectedSemester) return
    fetch(`${API}/student/subjects?year=${selectedYear}&semester=${selectedSemester}`)
      .then(r => r.json())
      .then(data => {
        setSubjects(Array.isArray(data) ? data : [])
        setSelectedSubjectId('')
      })
      .catch(() => setSubjects([]))
  }, [selectedYear, selectedSemester])

  const availableSemesters = selectedYear ? semesters[Number(selectedYear)] : []

  // Create new subject
  const handleCreateSubject = async e => {
    e.preventDefault()
    if (!selectedYear || !selectedSemester || !newSubjectName.trim()) return
    setCreatingSubject(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API}/admin/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          year: Number(selectedYear),
          semester: Number(selectedSemester),
          subject_name: newSubjectName.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to create subject')

      toast.success(`Subject "${data.subject_name}" created!`)
      setNewSubjectName('')

      const listRes = await fetch(
        `${API}/student/subjects?year=${selectedYear}&semester=${selectedSemester}`
      )
      const listData = await listRes.json()
      setSubjects(Array.isArray(listData) ? listData : [])
      setSelectedSubjectId(data.id)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreatingSubject(false)
    }
  }

  // Delete subject
  const handleDeleteSubjectConfirm = async () => {
    if (!subjectToDelete) return
    setDeletingSubject(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API}/admin/subjects/${subjectToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to delete subject')

      toast.success(`Subject "${subjectToDelete.subject_name}" removed!`)
      if (selectedSubjectId === subjectToDelete.id) {
        setSelectedSubjectId('')
      }
      setSubjectToDelete(null)

      const listRes = await fetch(
        `${API}/student/subjects?year=${selectedYear}&semester=${selectedSemester}`
      )
      const listData = await listRes.json()
      setSubjects(Array.isArray(listData) ? listData : [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeletingSubject(false)
    }
  }


  // Upload PDF Textbook
  const handleUploadPdf = async e => {
    e.preventDefault()
    if (!selectedSubjectId || !pdfFile) return
    setUploading(true)
    setUploadProgress('Extracting text pages & embedding content with Gemini...')

    try {
      const token = await getToken()
      const formData = new FormData()
      formData.append('file', pdfFile)

      const res = await fetch(
        `${API}/admin/upload-textbook?subject_id=${selectedSubjectId}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Upload failed')

      toast.success(`Successfully uploaded "${data.book_name}"! ${data.chunks_stored} pages indexed.`)
      setPdfFile(null)
      setUploadProgress('')
    } catch (err) {
      toast.error(err.message)
      setUploadProgress('')
    } finally {
      setUploading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out successfully')
    navigate('/login', { replace: true })
  }

  const handleNavTabClick = tab => {
    setActiveTab(tab)
    if (!isDesktop) setSidebarOpen(false)
  }

  return (
    <div style={styles.appWrapper}>
      {/* Dynamic Backdrop Overlay for Mobile/Tablet Off-canvas drawer */}
      {!isDesktop && sidebarOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
          }}
        />
      )}

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
          {/* Logo & Title (Fixed uncluttered header layout so Admin badge and close button X never collide) */}
          <div style={styles.logoWrap}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
              <div style={styles.logoIcon}>
                <Sparkles size={20} color="#0B0C10" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={styles.brandTitle}>Mathisis AI</span>
                  <span className="badge badge-green" style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem', flexShrink: 0 }}>
                    <Shield size={9} /> Admin
                  </span>
                </div>
                <span style={styles.brandSubtitle}>Admin Control Panel</span>
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
            <span style={styles.sectionHeader}>ADMINISTRATION</span>

            <button
              onClick={() => handleNavTabClick('upload')}
              className="nav-item-btn"
              style={{
                ...(activeTab === 'upload' ? styles.navItemActive : {})
              }}
            >
              <UploadCloud size={18} color={activeTab === 'upload' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              <span>Upload Textbooks</span>
              {activeTab === 'upload' && <div style={styles.activeDot} />}
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
              <Shield size={16} color="var(--accent-green)" />
            </div>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{user?.email?.split('@')[0]}</span>
              <span style={styles.userRole}>Administrator</span>
            </div>
            <button onClick={handleSignOut} title="Sign Out" className="icon-btn-hover" style={styles.logoutBtn}>
              <LogOut size={16} color="var(--text-muted)" />
            </button>
          </div>
        </aside>

        {/* ── CENTER CONTENT AREA ────────────────────────── */}
        <main style={styles.centerArea}>
          {/* Top Control Bar */}
          <div style={styles.topControlBar}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
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
              {activeTab === 'upload' && 'Course & Textbook Upload Center'}
              {activeTab === 'forum' && 'Student Q&A Forum Management'}
              {activeTab === 'help' && 'Help Center'}
              {activeTab === 'preferences' && 'Admin Preferences'}
            </span>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* TAB 1: UPLOAD TEXTBOOKS */}
            {activeTab === 'upload' && (
              <div style={styles.uploadTabContent}>
                <div style={styles.grid2Col}>

                  {/* Card 1: Subject Selection & Subject Creator */}
                  <div className="glass fade-in-up" style={styles.card}>
                    <div style={styles.cardHeader}>
                      <BookOpen size={20} color="var(--accent-green)" />
                      <h3 style={styles.cardTitle}>1. Select or Create Subject</h3>
                    </div>

                    {/* Step A: Select Year & Semester */}
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Select Academic Term</label>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <select
                          className="select-field"
                          value={selectedYear}
                          onChange={e => {
                            setSelectedYear(e.target.value)
                            setSelectedSemester('')
                            setSubjects([])
                            setSelectedSubjectId('')
                          }}
                          style={{ flex: 1, minWidth: '120px' }}
                        >
                          <option value="">Year...</option>
                          {years.map(y => <option key={y} value={y}>Year {y}</option>)}
                        </select>

                        <select
                          className="select-field"
                          value={selectedSemester}
                          onChange={e => {
                            setSelectedSemester(e.target.value)
                            setSelectedSubjectId('')
                          }}
                          disabled={!selectedYear}
                          style={{ flex: 1, minWidth: '120px' }}
                        >
                          <option value="">Semester...</option>
                          {availableSemesters.map(s => <option key={s} value={s}>Sem {s}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Step B: Existing Subject Select & Subject List with Delete Buttons */}
                    {selectedYear && selectedSemester && (
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Select Subject for Textbook Upload</label>
                        <select
                          className="select-field"
                          value={selectedSubjectId}
                          onChange={e => setSelectedSubjectId(e.target.value)}
                        >
                          <option value="">{subjects.length ? 'Select a Subject...' : 'No subjects found for this term'}</option>
                          {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                        </select>
                      </div>
                    )}

                    {selectedYear && selectedSemester && subjects.length > 0 && (
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Subject Management ({subjects.length})</label>
                        <div style={styles.subjectListContainer}>
                          {subjects.map(s => (
                            <div key={s.id} style={styles.subjectItemRow}>
                              <span style={styles.subjectItemName}>{s.subject_name}</span>
                              <button
                                type="button"
                                onClick={() => setSubjectToDelete(s)}
                                style={styles.deleteSubjectBtn}
                                title={`Remove ${s.subject_name}`}
                                className="icon-btn-hover"
                              >
                                <Trash2 size={15} color="#EF4444" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}


                    {/* Step C: Create New Subject Form */}
                    {selectedYear && selectedSemester && (
                      <form onSubmit={handleCreateSubject} style={styles.createSubjectForm}>
                        <label style={styles.label}>+ Add New Subject to Term</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <input
                            className="input-field"
                            placeholder="e.g. Applied Physics"
                            value={newSubjectName}
                            onChange={e => setNewSubjectName(e.target.value)}
                            required
                            style={{ flex: 1, minWidth: '160px' }}
                          />
                          <button
                            className="btn-primary"
                            type="submit"
                            disabled={creatingSubject || !newSubjectName.trim()}
                            style={{ flexShrink: 0, minHeight: '44px' }}
                          >
                            <Plus size={16} /> Add
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Card 2: Upload PDF File */}
                  <div className="glass fade-in-up" style={styles.card}>
                    <div style={styles.cardHeader}>
                      <UploadCloud size={20} color="var(--accent-green)" />
                      <h3 style={styles.cardTitle}>2. Upload Textbook PDF</h3>
                    </div>

                    {!selectedSubjectId ? (
                      <div style={styles.placeholderBox}>
                        <AlertCircle size={32} color="var(--text-muted)" />
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>
                          Please select or create a subject on the left to enable PDF uploading.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleUploadPdf} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={styles.dropzone}>
                          <FileText size={36} color={pdfFile ? 'var(--accent-green)' : 'var(--text-muted)'} />
                          {pdfFile ? (
                            <div>
                              <p style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{pdfFile.name}</p>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                                {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                                Click to select a PDF textbook
                              </p>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                                PDF files up to 50MB supported
                              </p>
                            </div>
                          )}
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={e => setPdfFile(e.target.files?.[0] || null)}
                            style={styles.fileInputHidden}
                          />
                        </div>

                        {uploadProgress && (
                          <div style={styles.progressBox}>
                            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                            <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: '600' }}>
                              {uploadProgress}
                            </span>
                          </div>
                        )}

                        <button
                          className="btn-primary"
                          type="submit"
                          disabled={!pdfFile || uploading}
                          style={{ width: '100%', minHeight: '44px' }}
                        >
                          {uploading ? 'Processing & Indexing PDF...' : 'Upload & Process Textbook'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ASK Q&A FORUM MANAGEMENT */}
            {activeTab === 'forum' && <ForumPanel />}

            {/* TAB 3: HELP CENTER */}
            {activeTab === 'help' && <HelpCenterPanel />}

            {/* TAB 4: PREFERENCES */}
            {activeTab === 'preferences' && (
              <PreferencesPanel
                theme={theme}
                setTheme={setTheme}
                answerStyle={answerStyle}
                setAnswerStyle={setAnswerStyle}
              />
            )}

          </div>

          {/* ── DEDICATED MOBILE BOTTOM NAVIGATION BAR FOR ADMIN ── */}
          {!isDesktop && (
            <div style={styles.mobileBottomNav}>
              <button
                onClick={() => setActiveTab('upload')}
                className="mobile-nav-btn"
                style={{
                  color: activeTab === 'upload' ? 'var(--accent-green)' : 'var(--text-muted)'
                }}
              >
                <UploadCloud size={18} />
                <span style={styles.mobileNavLabel}>Upload</span>
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
                onClick={() => setActiveTab('preferences')}
                className="mobile-nav-btn"
                style={{
                  color: activeTab === 'preferences' ? 'var(--accent-green)' : 'var(--text-muted)'
                }}
              >
                <Settings size={18} />
                <span style={styles.mobileNavLabel}>Settings</span>
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
      </div>

      {/* Delete Subject Confirmation Modal */}
      {subjectToDelete && (
        <div style={styles.modalOverlay} onClick={() => setSubjectToDelete(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()} className="fade-in-up">
            <div style={styles.modalHeader}>
              <div style={styles.modalWarningIcon}>
                <AlertTriangle size={22} color="#EF4444" />
              </div>
              <h3 style={styles.modalTitle}>Remove Subject</h3>
            </div>
            <p style={styles.modalBodyText}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{subjectToDelete.subject_name}</strong>? This action cannot be undone and will delete all indexed textbook materials for this subject.
            </p>
            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                style={styles.cancelBtn}
                disabled={deletingSubject}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubjectConfirm}
                style={styles.confirmDeleteBtn}
                disabled={deletingSubject}
              >
                {deletingSubject ? 'Deleting...' : 'Delete Subject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  subjectListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    maxHeight: '180px',
    overflowY: 'auto',
    padding: '0.5rem',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
  },
  subjectItemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.45rem 0.65rem',
    background: 'var(--bg-card)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
  },
  subjectItemName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  deleteSubjectBtn: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '6px',
    padding: '0.35rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  modalContent: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '1.5rem',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  modalWarningIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'rgba(239, 68, 68, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  modalBodyText: {
    fontSize: '0.88rem',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  cancelBtn: {
    padding: '0.6rem 1.1rem',
    borderRadius: '10px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontWeight: '600',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  confirmDeleteBtn: {
    padding: '0.6rem 1.1rem',
    borderRadius: '10px',
    background: '#EF4444',
    border: 'none',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.85rem',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
  },
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
  navSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  sectionHeader: {
    fontSize: '0.65rem',
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
    minHeight: '44px',
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
    fontSize: '0.82rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: '0.68rem',
    color: 'var(--accent-green)',
    fontWeight: '600',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.45rem',
    minWidth: '44px',
    minHeight: '44px',
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
    fontSize: '0.9rem',
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
  uploadTabContent: {
    padding: '1rem',
    maxWidth: '1000px',
    width: '100%',
    margin: '0 auto',
  },
  grid2Col: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
  },
  card: {
    padding: '1.25rem',
    borderRadius: '16px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  label: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
  },
  createSubjectForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid var(--border-color)',
  },
  placeholderBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2.5rem 1rem',
    border: '1px dashed var(--border-color)',
    borderRadius: '12px',
  },
  dropzone: {
    border: '2px dashed var(--border-color)',
    borderRadius: '14px',
    padding: '1.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    textAlign: 'center',
    position: 'relative',
    cursor: 'pointer',
    background: 'var(--bg-panel)',
    transition: 'border-color 0.2s',
  },
  fileInputHidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
  progressBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: '0.75rem',
    background: 'var(--bg-panel)',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
  },
}
