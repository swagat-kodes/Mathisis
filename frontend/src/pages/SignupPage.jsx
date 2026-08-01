import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { BookOpen, UserPlus, Mail, Lock, User } from 'lucide-react'

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match')
    }
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters')
    }
    setLoading(true)
    const { error } = await signUp(form.email, form.password, form.fullName)
    setLoading(false)
    if (error) return toast.error(error.message)
    toast.success('Account created! Please check your email to confirm.')
    navigate('/login')
  }

  return (
    <div style={styles.page}>
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <div className="glass fade-in-up" style={styles.card}>
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>
            <BookOpen size={28} color="#60a5fa" />
          </div>
          <h1 style={styles.logoText} className="gradient-text">Mathisis</h1>
        </div>
        <p style={styles.tagline}>Join thousands of engineering students</p>

        <h2 style={styles.heading}>Create account</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Full Name</label>
            <div style={styles.inputWrap}>
              <User size={16} style={styles.inputIcon} />
              <input id="signup-name" className="input-field" style={{ paddingLeft: '2.5rem' }}
                type="text" name="fullName" placeholder="John Engineer"
                value={form.fullName} onChange={handleChange} required />
            </div>
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrap}>
              <Mail size={16} style={styles.inputIcon} />
              <input id="signup-email" className="input-field" style={{ paddingLeft: '2.5rem' }}
                type="email" name="email" placeholder="you@university.edu"
                value={form.email} onChange={handleChange} required />
            </div>
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrap}>
              <Lock size={16} style={styles.inputIcon} />
              <input id="signup-password" className="input-field" style={{ paddingLeft: '2.5rem' }}
                type="password" name="password" placeholder="min. 6 characters"
                value={form.password} onChange={handleChange} required />
            </div>
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.label}>Confirm Password</label>
            <div style={styles.inputWrap}>
              <Lock size={16} style={styles.inputIcon} />
              <input id="signup-confirm" className="input-field" style={{ paddingLeft: '2.5rem' }}
                type="password" name="confirmPassword" placeholder="••••••••"
                value={form.confirmPassword} onChange={handleChange} required />
            </div>
          </div>

          <p style={styles.note}>
            ℹ️ Your account defaults to <strong>student</strong> role. Contact admin to be promoted.
          </p>

          <button id="signup-submit" className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading
              ? <><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></>
              : <><UserPlus size={16}/> Create Account</>
            }
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: 'var(--bg-base)' },
  orb1: { position: 'absolute', top: '-100px', right: '-100px', width: '450px', height: '450px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)', pointerEvents: 'none' },
  orb2: { position: 'absolute', bottom: '-100px', left: '-100px', width: '450px', height: '450px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.1), transparent 70%)', pointerEvents: 'none' },
  card: { width: '100%', maxWidth: '420px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', position: 'relative', zIndex: 1 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  logoIcon: { width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: "'Outfit', sans-serif", fontSize: '1.75rem', fontWeight: '800' },
  tagline: { color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-0.25rem' },
  heading: { fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  label: { fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  note: { fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(59,130,246,0.08)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.15)' },
  switchText: { textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' },
  link: { color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' },
}
