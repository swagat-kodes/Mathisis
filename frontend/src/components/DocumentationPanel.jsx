import { useState, useEffect } from 'react'
import { FileText, Download, BookOpen, Search, Layers, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function DocumentationPanel({
  selectedYear, setSelectedYear,
  selectedSemester, setSelectedSemester,
  years, availableSemesters,
  subjects, selectedSubject, setSelectedSubject
}) {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const fetchMaterials = async () => {
    setLoading(true)
    try {
      let url = `${API}/student/materials?`
      if (selectedYear) url += `year=${selectedYear}&`
      if (selectedSemester) url += `semester=${selectedSemester}&`
      if (selectedSubject?.id) url += `subject_id=${selectedSubject.id}&`

      const res = await fetch(url)
      const data = await res.json()
      setMaterials(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load documentation materials')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMaterials()
  }, [selectedYear, selectedSemester, selectedSubject?.id])

  const filteredMaterials = materials.filter(m =>
    m.book_name.toLowerCase().includes(search.toLowerCase()) ||
    m.subject_name.toLowerCase().includes(search.toLowerCase())
  )

  const handleDownload = (bookName) => {
    toast.success(`Starting download for ${bookName}...`)
  }

  return (
    <div style={styles.panel}>
      {/* Header & Filters */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <FileText size={20} color="var(--accent-green)" />
          <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
            Course Documentation & Textbooks
          </span>
          <span className="badge badge-green">{filteredMaterials.length} PDFs</span>
        </div>

        {/* Filters */}
        <div style={styles.filterGroup}>
          <select
            className="select-field"
            value={selectedYear}
            onChange={e => {
              setSelectedYear(e.target.value)
              setSelectedSemester('')
              setSelectedSubject(null)
            }}
            style={{ width: '110px' }}
          >
            <option value="">All Years</option>
            {years?.map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>

          <select
            className="select-field"
            value={selectedSemester}
            onChange={e => {
              setSelectedSemester(e.target.value)
              setSelectedSubject(null)
            }}
            disabled={!selectedYear}
            style={{ width: '120px' }}
          >
            <option value="">All Semesters</option>
            {availableSemesters?.map(s => <option key={s} value={s}>Sem {s}</option>)}
          </select>

          <select
            className="select-field"
            value={selectedSubject?.id || ''}
            onChange={e => {
              const sub = subjects.find(s => s.id === e.target.value)
              setSelectedSubject(sub || null)
            }}
            disabled={!selectedSemester || subjects.length === 0}
            style={{ width: '150px' }}
          >
            <option value="">{subjects.length ? 'All Subjects' : 'No Subjects'}</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div style={styles.searchWrap}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search size={16} style={styles.searchIcon} />
          <input
            className="input-field"
            placeholder="Search textbook title or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      {/* Materials Grid */}
      <div style={styles.gridContainer}>
        {loading ? (
          <div style={styles.empty}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', fontSize: '0.85rem' }}>
              Loading course materials...
            </p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div style={styles.empty}>
            <BookOpen size={36} color="var(--text-muted)" />
            <p style={{ color: 'var(--text-primary)', fontWeight: '600', marginTop: '0.75rem' }}>
              No course textbooks found
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
              Textbooks uploaded by admins for your selected year/semester will appear here.
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredMaterials.map(mat => (
              <div key={mat.id} className="card-hover fade-in-up" style={styles.card}>
                <div style={styles.pdfBadge}>
                  <FileText size={24} color="var(--accent-green)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>
                      Year {mat.year} · Sem {mat.semester}
                    </span>
                  </div>
                  <h3 style={styles.bookTitle}>{mat.book_name}</h3>
                  <p style={styles.subjectName}>{mat.subject_name}</p>
                  <p style={styles.pageMeta}>
                    <Layers size={12} /> {mat.max_page} pages indexed
                  </p>
                </div>
                <div style={styles.cardActions}>
                  <button
                    className="btn-primary"
                    onClick={() => handleDownload(mat.book_name)}
                    style={{ width: '100%', height: '36px', fontSize: '0.8rem' }}
                  >
                    <Download size={14} /> Download PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  panel: { display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, background: 'var(--bg-panel)', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-panel)', flexWrap: 'wrap', gap: '0.75rem' },
  filterGroup: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  searchWrap: { padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-panel)' },
  searchIcon: { position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  gridContainer: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.25rem' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', textAlign: 'center' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' },
  card: { padding: '1.125rem', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.875rem', transition: 'border-color 0.2s' },
  pdfBadge: { width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(43, 242, 160, 0.12)', border: '1px solid rgba(43, 242, 160, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bookTitle: { fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  subjectName: { fontSize: '0.78rem', color: 'var(--accent-green)', fontWeight: '600', marginTop: '2px' },
  pageMeta: { fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.35rem' },
  cardActions: { marginTop: 'auto', pt: '0.5rem' },
}
