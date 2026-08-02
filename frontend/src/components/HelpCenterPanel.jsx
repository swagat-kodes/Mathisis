import { useState } from 'react'
import { HelpCircle, Search, ChevronDown, ChevronUp, Mail, BookOpen, Shield, MessageSquare, Sparkles } from 'lucide-react'

export default function HelpCenterPanel() {
  const [search, setSearch] = useState('')
  const [openFaq, setOpenFaq] = useState(0)

  const faqs = [
    {
      q: 'How does Mathisis AI answer engineering questions?',
      a: 'Mathisis AI uses Retrieval-Augmented Generation (RAG). It matches your question against officially uploaded course textbooks and generates precise answers complete with page citations.'
    },
    {
      q: 'How do I change answer depth between Concise and Detailed?',
      a: 'Go to the Preferences tab in the left sidebar. Under "Answer Detail Level", select Concise for quick summaries or Detailed for step-by-step derivations.'
    },
    {
      q: 'Where can I download textbook PDFs?',
      a: 'Click on the Documentation tab in the left sidebar. Filter by Year, Semester, and Subject to access and download official course materials.'
    },
    {
      q: 'What if no material is found for my subject?',
      a: 'If a subject has no textbook uploaded, contact your Admin instructor to upload the course PDF in the Admin Dashboard.'
    },
    {
      q: 'How do I post in the Ask Q&A Forum?',
      a: 'Switch to the "Ask Q&A Forum" tab, choose your subject, and click "+ New Post" to submit a question to professors and peers.'
    }
  ]

  const filteredFaqs = faqs.filter(f =>
    f.q.toLowerCase().includes(search.toLowerCase()) ||
    f.a.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <HelpCircle size={20} color="var(--accent-green)" />
          <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
            Help Center & Support
          </span>
        </div>
      </div>

      <div style={styles.content}>
        {/* Banner */}
        <div style={styles.banner}>
          <div style={styles.bannerIcon}>
            <Sparkles size={28} color="#0B0C10" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              How can we help you learn today?
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Find quick answers to common questions about Mathisis AI, textbook citations, and course materials.
            </p>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '100%', marginBottom: '1.25rem' }}>
          <Search size={16} style={styles.searchIcon} />
          <input
            className="input-field"
            placeholder="Search FAQs and help guides..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* FAQs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Frequently Asked Questions
          </h3>

          {filteredFaqs.map((faq, index) => (
            <div key={index} style={styles.faqCard}>
              <div
                style={styles.faqHeader}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {faq.q}
                </span>
                {openFaq === index ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
              </div>
              {openFaq === index && (
                <div style={styles.faqBody} className="fade-in-up">
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Support Card */}
        <div style={styles.supportCard}>
          <Mail size={22} color="var(--accent-green)" />
          <div>
            <h4 style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-primary)' }}>Need direct support?</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Reach out to our support team at <strong style={{ color: 'var(--accent-green)' }}>support@mathisis.ai</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  panel: { display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, background: 'var(--bg-panel)', overflow: 'hidden' },
  header: { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-panel)' },
  content: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.5rem', maxWidth: '800px', width: '100%', margin: '0 auto' },
  banner: { padding: '1.25rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' },
  bannerIcon: { width: '48px', height: '48px', borderRadius: '14px', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  searchIcon: { position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  faqCard: { borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', overflow: 'hidden' },
  faqHeader: { padding: '0.875rem 1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' },
  faqBody: { padding: '0 1.125rem 1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' },
  supportCard: { padding: '1rem 1.25rem', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' },
}
