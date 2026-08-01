import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'
import {
  UploadCloud, BookOpen, ChevronDown, FileText,
  CheckCircle, LogOut, Shield, Loader
} from 'lucide-react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [subjects, setSubjects] = useState([])
  const [years] = useState([1, 2, 3, 4])
  const semesters = { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8] }

  const [form, setForm] = useState({
    year: '', semester: '', subjectName: '', bookName: '', file: null
  })
  const [customSubject, setCustomSubject] = useState('')  // for '+ Add new subject' flow
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  // Re-fetch subjects when year/semester changes
  useEffect(() => {
    if (!form.year || !form.semester) return
    fetch(`${API}/student/subjects?year=${form.year}&semester=${form.semester}`)
      .then(r => r.json())
      .then(data => {
        setSubjects(Array.isArray(data) ? data : [])
        setForm(f => ({ ...f, subjectName: '' }))
        setCustomSubject('')
      })
      .catch(() => setSubjects([]))
  }, [form.year, form.semester])

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setUploadResult(null)
  }

  const handleFile = file => {
    if (!file?.name?.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are accepted')
      return
    }
    setForm(f => ({ ...f, file }))
    setUploadResult(null)
  }

  const handleDrop = useCallback(e => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const handleSubmit = async e => {
    e.preventDefault()
    const { year, semester, bookName, file } = form
    // Resolve the actual subject name: either from dropdown or custom input
    const subjectName = form.subjectName === '__new__' ? customSubject.trim() : form.subjectName
    if (!year || !semester || !subjectName || !bookName || !file) {
      return toast.error('Please fill all fields and select a PDF')
    }

    setUploading(true)
    setUploadResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const body = new FormData()
      body.append('file', file)
      body.append('year', year)
      body.append('semester', semester)
      body.append('subject_name', subjectName)
      body.append('book_name', bookName)

      const res = await fetch(`${API}/admin/upload-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Upload failed')
      setUploadResult(data)
      toast.success('PDF processed successfully!')
      setForm(f => ({ ...f, file: null, bookName: '' }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const availableSemesters = form.year ? semesters[Number(form.year)] : []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={styles.navLogo}><BookOpen size={22} color="#60a5fa" /></div>
          <span style={styles.navTitle} className="gradient-text">Mathisis</span>
          <span className="badge badge-blue" style={{ marginLeft: '0.5rem' }}>
            <Shield size={11} /> Admin
          </span>
        </div>
        <button className="btn-secondary" onClick={signOut} style={{ gap: '0.4rem' }}>
          <LogOut size={15} /> Sign Out
        </button>
      </nav>

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <p style={styles.subtitle}>Upload textbooks to power the AI Tutor</p>
        </div>

        <div style={styles.grid}>
          {/* Upload Card */}
          <div className="glass" style={styles.uploadCard}>
            <h2 style={styles.cardTitle}><UploadCloud size={20} color="#60a5fa" /> Upload Textbook PDF</h2>

            <form onSubmit={handleSubmit} style={styles.form}>
              {/* Year */}
              <div style={styles.fieldRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Year</label>
                  <div style={styles.selectWrap}>
                    <select id="year-select" className="select-field" name="year" value={form.year} onChange={handleChange}>
                      <option value="">Select Year</option>
                      {years.map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                    <ChevronDown size={14} style={styles.chevron} />
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Semester</label>
                  <div style={styles.selectWrap}>
                    <select id="semester-select" className="select-field" name="semester" value={form.semester} onChange={handleChange} disabled={!form.year}>
                      <option value="">Select Semester</option>
                      {availableSemesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                    <ChevronDown size={14} style={styles.chevron} />
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div style={styles.field}>
                <label style={styles.label}>Subject</label>
                <div style={styles.selectWrap}>
                  <select id="subject-select" className="select-field" name="subjectName" value={form.subjectName} onChange={handleChange} disabled={!form.semester}>
                    <option value="">Select or type subject</option>
                    {subjects.map(s => <option key={s.id} value={s.subject_name}>{s.subject_name}</option>)}
                    <option value="__new__">+ Add new subject...</option>
                  </select>
                  <ChevronDown size={14} style={styles.chevron} />
                </div>
                {form.subjectName === '__new__' && (
                  <input
                    id="new-subject-input"
                    className="input-field"
                    style={{ marginTop: '0.5rem' }}
                    placeholder="Enter new subject name"
                    value={customSubject}
                    onChange={e => setCustomSubject(e.target.value)}
                    autoFocus
                  />
                )}
              </div>

              {/* Book Name */}
              <div style={styles.field}>
                <label style={styles.label}>Book Name</label>
                <input id="book-name-input" className="input-field" name="bookName" placeholder="e.g. Introduction to Algorithms, 3rd Ed."
                  value={form.bookName} onChange={handleChange} />
              </div>

              {/* File Drop Zone */}
              <div style={styles.field}>
                <label style={styles.label}>PDF File</label>
                <label
                  id="file-drop-zone"
                  style={{
                    ...styles.dropZone,
                    borderColor: isDragging ? 'var(--accent)' : form.file ? 'var(--accent-green)' : 'var(--border)',
                    background: isDragging ? 'rgba(59,130,246,0.05)' : 'transparent',
                  }}
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                >
                  <input type="file" accept=".pdf" style={{ display: 'none' }}
                    onChange={e => handleFile(e.target.files[0])} />
                  {form.file ? (
                    <div style={{ textAlign: 'center' }}>
                      <FileText size={32} color="var(--accent-green)" style={{ margin: '0 auto 0.5rem' }} />
                      <p style={{ color: 'var(--accent-green)', fontWeight: '500', fontSize: '0.9rem' }}>{form.file.name}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                        {(form.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <UploadCloud size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Drag & drop PDF or <span style={{ color: 'var(--accent)' }}>click to browse</span>
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.25rem' }}>Max file size: 50MB</p>
                    </div>
                  )}
                </label>
              </div>

              <button id="upload-submit" className="btn-primary" type="submit" disabled={uploading} style={{ width: '100%' }}>
                {uploading
                  ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing PDF...</>
                  : <><UploadCloud size={16} /> Upload & Process</>
                }
              </button>
            </form>

            {/* Result */}
            {uploadResult && (
              <div className="fade-in-up" style={styles.result}>
                <CheckCircle size={20} color="var(--accent-green)" />
                <div>
                  <p style={{ fontWeight: '600', color: 'var(--accent-green)' }}>Upload successful!</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    📄 {uploadResult.pages_processed} pages · 🔢 {uploadResult.chunks_inserted} chunks stored
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Info Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass" style={styles.infoCard}>
              <h3 style={styles.infoTitle}>How it works</h3>
              {[
                ['1', 'Select the year, semester, and subject for the textbook.'],
                ['2', 'Enter the book title for source citations in student answers.'],
                ['3', 'Upload the PDF — it will be parsed page-by-page.'],
                ['4', 'Each page is chunked and embedded using Gemini AI.'],
                ['5', 'Students can now query this book via the AI Chat.'],
              ].map(([n, text]) => (
                <div key={n} style={styles.infoStep}>
                  <span style={styles.stepBadge}>{n}</span>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' },
  header: { marginBottom: '2rem' },
  title: { fontSize: '1.75rem', fontWeight: '800', fontFamily: "'Outfit', sans-serif" },
  subtitle: { color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' },
  uploadCard: { padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  cardTitle: { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: '700' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.125rem' },
  fieldRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  label: { fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' },
  selectWrap: { position: 'relative' },
  chevron: { position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' },
  dropZone: {
    display: 'block', padding: '2rem', borderRadius: '12px',
    border: '2px dashed', cursor: 'pointer', transition: 'all 0.2s ease',
  },
  result: {
    display: 'flex', alignItems: 'center', gap: '0.875rem',
    padding: '1rem', borderRadius: '10px',
    background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  infoCard: { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  infoTitle: { fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' },
  infoStep: { display: 'flex', gap: '0.75rem', alignItems: 'flex-start' },
  stepBadge: {
    minWidth: '22px', height: '22px', borderRadius: '50%',
    background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
    color: '#60a5fa', fontSize: '0.75rem', fontWeight: '700',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  navLogo: { width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: "'Outfit', sans-serif", fontSize: '1.4rem', fontWeight: '800' },
}
