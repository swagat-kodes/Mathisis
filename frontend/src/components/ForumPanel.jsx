import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'
import {
  MessageSquare, Plus, X, Flag, CheckCircle, Trash2,
  Clock, Lock, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

export default function ForumPanel({ subjectId }) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [queries, setQueries] = useState([])
  const [loadingQueries, setLoadingQueries] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({ title: '', content: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchQueries = async () => {
    if (!subjectId) return
    setLoadingQueries(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API}/forum/queries?subject_id=${subjectId}`, {
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

  useEffect(() => { fetchQueries() }, [subjectId])

  const handlePost = async e => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) return
    setSubmitting(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API}/forum/queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject_id: subjectId, ...form }),
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
          <MessageSquare size={18} color="#a78bfa" />
          <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Forum</span>
          <span className="badge badge-gray">{queries.length}</span>
        </div>
        {subjectId && (
          <button id="new-post-btn" className="btn-primary" onClick={() => setShowNew(s => !s)}
            style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
            <Plus size={14} /> New Post
          </button>
        )}
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
        {!subjectId && (
          <div style={styles.empty}>
            <MessageSquare size={32} color="var(--text-muted)" />
            <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>Select a subject to view the forum</p>
          </div>
        )}
        {subjectId && loadingQueries && (
          <div style={styles.empty}>
            <div style={{ display: 'flex', gap: '5px' }}>
              <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
            </div>
          </div>
        )}
        {subjectId && !loadingQueries && queries.length === 0 && (
          <div style={styles.empty}>
            <MessageSquare size={28} color="var(--text-muted)" />
            <p style={{ color: 'var(--text-muted)', marginTop: '0.625rem', fontSize: '0.875rem' }}>
              No questions yet. Be the first to ask!
            </p>
          </div>
        )}
        {queries.map(q => (
          <div key={q.id} className="fade-in-up" style={{
            ...styles.queryCard,
            borderColor: q.is_flagged ? 'rgba(245,158,11,0.4)' : 'var(--border)',
            background: q.is_flagged ? 'rgba(245,158,11,0.04)' : 'var(--bg-card)',
          }}>
            {/* Top row */}
            <div style={styles.queryTop} onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  {q.is_flagged && <span className="badge badge-amber"><Flag size={10} /> Flagged</span>}
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

                {/* Admin actions */}
                {isAdmin && (
                  <div style={styles.adminActions}>
                    {q.status === 'open'
                      ? <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                          onClick={() => handleStatus(q.id, 'closed')}>
                          <CheckCircle size={13} /> Close
                        </button>
                      : <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                          onClick={() => handleStatus(q.id, 'open')}>
                          <Clock size={13} /> Reopen
                        </button>
                    }
                    <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', color: q.is_flagged ? '#fbbf24' : 'var(--text-secondary)' }}
                      onClick={() => handleFlag(q.id)}>
                      <Flag size={13} /> {q.is_flagged ? 'Unflag' : 'Flag'}
                    </button>
                    <button className="btn-danger" onClick={() => handleDelete(q.id)}>
                      <Trash2 size={13} /> Delete
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
  panel: { display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' },
  newForm: { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'rgba(99,102,241,0.05)' },
  list: { flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center' },
  queryCard: { borderRadius: '12px', border: '1px solid', overflow: 'hidden', transition: 'border-color 0.2s' },
  queryTop: { padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer' },
  queryTitle: { fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  queryDate: { fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.175rem' },
  queryBody: { padding: '0 1rem 1rem', borderTop: '1px solid var(--border-subtle)' },
  queryContent: { fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginTop: '0.75rem', whiteSpace: 'pre-wrap' },
  adminActions: { display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' },
}
