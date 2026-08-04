import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'
import {
  MessageSquare, Plus, X, Flag, CheckCircle, Trash2,
  Clock, Lock, ChevronDown, ChevronUp
} from 'lucide-react'

const API = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

export default function ForumPanel({ subjectId: externalSubjectId }) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [years] = useState([1, 2, 3, 4])
  const semesters = { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8] }

  const [selectedYear, setSelectedYear] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('')
  const [subjects, setSubjects] = useState([])
  const [internalSubjectId, setInternalSubjectId] = useState('')

  const activeSubjectId = externalSubjectId || internalSubjectId

  const [queries, setQueries] = useState([])
  const [loadingQueries, setLoadingQueries] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({ title: '', content: '' })
  const [submitting, setSubmitting] = useState(false)

  // Fetch subjects when year/semester changes
  useEffect(() => {
    if (!selectedYear || !selectedSemester) return
    fetch(`${API}/student/subjects?year=${selectedYear}&semester=${selectedSemester}`)
      .then(r => r.json())
      .then(data => {
        setSubjects(Array.isArray(data) ? data : [])
        setInternalSubjectId('')
      })
      .catch(() => setSubjects([]))
  }, [selectedYear, selectedSemester])

  const availableSemesters = selectedYear ? semesters[Number(selectedYear)] : []

  const fetchQueries = async () => {
    if (!activeSubjectId) return
    setLoadingQueries(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API}/forum/queries?subject_id=${activeSubjectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setQueries(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load forum')
    } finally {
      setLoadingQueries(false)
    }
  }

  useEffect(() => { fetchQueries() }, [activeSubjectId])

  const handlePost = async e => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) return
    setSubmitting(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API}/forum/queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject_id: activeSubjectId, ...form }),
      })
      if (!res.ok) throw new Error((await res.json()).detail)
      toast.success('Question posted!')
      setShowNew(false)
      setForm({ title: '', content: '' })
      fetchQueries()
    } catch (err) { toast.error(err.message) }
    finally { setSubmitting(false) }
  }

  const handleStatus = async (id, status) => {
    try {
      const token = await getToken()
      const res = await fetch(`${API}/forum/queries/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error((await res.json()).detail)
      toast.success(`Query ${status}`)
      fetchQueries()
    } catch (err) { toast.error(err.message) }
  }

  const handleFlag = async (id) => {
    try {
      const token = await getToken()
      const res = await fetch(`${API}/forum/queries/${id}/flag`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error((await res.json()).detail)
      toast.success('Flag toggled')
      fetchQueries()
    } catch (err) { toast.error(err.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this query permanently?')) return
    try {
      const token = await getToken()
      const res = await fetch(`${API}/forum/queries/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error((await res.json()).detail)
      toast.success('Deleted')
      fetchQueries()
    } catch (err) { toast.error(err.message) }
  }

  const formatDate = iso => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <MessageSquare size={18} color="var(--accent-green)" />
          <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            Ask Q&A Forum {isAdmin && '(Admin Mode)'}
          </span>
          <span className="badge badge-green">{queries.length}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Inline Subject Selectors if not passed externally */}
          {!externalSubjectId && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <select
                className="select-field"
                value={selectedYear}
                onChange={e => { setSelectedYear(e.target.value); setSelectedSemester(''); setInternalSubjectId(''); }}
                style={{ width: '90px', padding: '0.35rem 1.5rem 0.35rem 0.6rem', fontSize: '0.78rem' }}
              >
                <option value="">Year</option>
                {years.map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>

              <select
                className="select-field"
                value={selectedSemester}
                onChange={e => { setSelectedSemester(e.target.value); setInternalSubjectId(''); }}
                disabled={!selectedYear}
                style={{ width: '90px', padding: '0.35rem 1.5rem 0.35rem 0.6rem', fontSize: '0.78rem' }}
              >
                <option value="">Sem</option>
                {availableSemesters.map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>

              <select
                className="select-field"
                value={internalSubjectId}
                onChange={e => setInternalSubjectId(e.target.value)}
                disabled={!selectedSemester || subjects.length === 0}
                style={{ width: '130px', padding: '0.35rem 1.5rem 0.35rem 0.6rem', fontSize: '0.78rem' }}
              >
                <option value="">Subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
              </select>
            </div>
          )}

          {activeSubjectId && (
            <button id="new-post-btn" className="btn-primary" onClick={() => setShowNew(s => !s)}
              style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
              <Plus size={14} /> New Post
            </button>
          )}
        </div>
      </div>

      {/* New Post Form */}
      {showNew && (
        <div className="fade-in-up" style={styles.newForm}>
          <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input id="forum-title-input" className="input-field" placeholder="Question title..."
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            <textarea id="forum-content-input" className="input-field" placeholder="Describe your question in detail..."
              value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={3} style={{ resize: 'vertical' }} required />
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button id="forum-post-submit" className="btn-primary" type="submit" disabled={submitting} style={{ flex: 1 }}>
                {submitting ? 'Posting...' : 'Post Question'}
              </button>
              <button className="btn-secondary" type="button" onClick={() => setShowNew(false)}>
                <X size={15} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Query List */}
      <div style={styles.list}>
        {!activeSubjectId && (
          <div style={styles.empty}>
            <MessageSquare size={36} color="var(--text-muted)" />
            <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              Select a Year, Semester, and Subject above to view and manage questions
            </p>
          </div>
        )}
        {activeSubjectId && loadingQueries && (
          <div style={styles.empty}>
            <div style={{ display: 'flex', gap: '5px' }}>
              <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
            </div>
          </div>
        )}
        {activeSubjectId && !loadingQueries && queries.length === 0 && (
          <div style={styles.empty}>
            <MessageSquare size={28} color="var(--text-muted)" />
            <p style={{ color: 'var(--text-muted)', marginTop: '0.625rem', fontSize: '0.875rem' }}>
              No questions posted for this subject yet.
            </p>
          </div>
        )}
        {queries.map(q => (
          <div key={q.id} className="forum-card-hover fade-in-up" style={{
            ...styles.queryCard,
            borderColor: q.is_flagged ? 'var(--accent-gold)' : 'var(--border-color)',
            background: q.is_flagged ? 'rgba(245,158,11,0.06)' : 'var(--bg-card)',
          }}>
            {/* Top row */}
            <div style={styles.queryTop} onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  {q.is_flagged && <span className="badge badge-gold"><Flag size={10} /> Flagged</span>}
                  <span className={`badge ${q.status === 'open' ? 'badge-green' : 'badge-gray'}`}>
                    {q.status === 'open' ? <Clock size={10} /> : <Lock size={10} />}
                    {q.status}
                  </span>
                </div>
                <p style={styles.queryTitle}>{q.title}</p>
                <p style={styles.queryDate}>{formatDate(q.created_at)}</p>
              </div>
              {expanded === q.id ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
            </div>

            {/* Expanded content */}
            {expanded === q.id && (
              <div className="fade-in-up" style={styles.queryBody}>
                <p style={styles.queryContent}>{q.content}</p>

                {/* Admin actions (visible to admins) */}
                {isAdmin && (
                  <div style={styles.adminActions}>
                    {q.status === 'open'
                      ? <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                          onClick={() => handleStatus(q.id, 'closed')}>
                          <CheckCircle size={13} /> Close Question
                        </button>
                      : <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                          onClick={() => handleStatus(q.id, 'open')}>
                          <Clock size={13} /> Reopen Question
                        </button>
                    }
                    <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', color: q.is_flagged ? 'var(--accent-gold)' : 'var(--text-muted)' }}
                      onClick={() => handleFlag(q.id)}>
                      <Flag size={13} /> {q.is_flagged ? 'Unflag' : 'Flag Question'}
                    </button>
                    <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleDelete(q.id)}>
                      <Trash2 size={13} /> Remove Query
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  panel: { display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, background: 'var(--bg-panel)', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-panel)', flexWrap: 'wrap', gap: '0.5rem' },
  newForm: { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' },
  list: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center' },
  queryCard: { borderRadius: '14px', border: '1px solid var(--border-color)', overflow: 'hidden', transition: 'border-color 0.2s' },
  queryTop: { padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer' },
  queryTitle: { fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  queryDate: { fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.175rem' },
  queryBody: { padding: '0 1rem 1rem', borderTop: '1px solid var(--border-color)' },
  queryContent: { fontSize: '0.85rem', color: 'var(--text-primary)', opacity: 0.9, lineHeight: '1.6', marginTop: '0.75rem', whiteSpace: 'pre-wrap' },
  adminActions: { display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' },
}
