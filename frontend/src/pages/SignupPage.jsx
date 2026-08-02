import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Sparkles, UserPlus, Mail, Lock, User, Shield, GraduationCap } from 'lucide-react'

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('student') // 'student' | 'admin'
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
    const { error } = await signUp(form.email, form.password, form.fullName, role)
    setLoading(false)
    if (error) return toast.error(error.message)
    toast.success(`Account created as ${role.toUpperCase()}! Please check your email to confirm.`)
    navigate('/login')
  }

  return (
    <div style={styles.page}>
      <div style={styles.glowOrb} />

      <div className="glass fade-in-up" style={styles.card}>
        {/* Single App Logo Icon: Sparkles */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>
            <Sparkles size={24} color="#0B0C10" />
          </div>
          <h1 style={styles.logoText}>Mathisis AI</h1>
        </div>
        <p style={styles.tagline}>Smart, Personalized Engineering AI Companion</p>

        {/* Role Toggle Selector */}
        <div style={styles.roleToggleWrap}>
          <button
            type="button"
            onClick={() => setRole('student')}
            style={{
              ...styles.roleTab,
              ...(role === 'student' ? styles.roleTabActive : {})
            }}
          >
            <GraduationCap size={16} /> Student Sign Up
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            style={{
              ...styles.roleTab,
              ...(role === 'admin' ? styles.roleTabActive : {})
            }}
          >
            <Shield size={16} /> Admin Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Full Name</label>
            <div style={styles.inputWrap}>
              <User size={16} style={styles.inputIcon} />
              <input id="signup-name" className="input-field" style={{ paddingLeft: '2.5rem' }}
                type="text" name="fullName" placeholder={role === 'admin' ? 'Admin Name' : 'Student Name'}
                value={form.fullName} onChange={handleChange} required />
            </div>
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.label}>Email Address</label>
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
            Creating account as: <strong style={{ color: 'var(--accent-green)', textTransform: 'capitalize' }}>{role}</strong>
          </p>

          <button id="signup-submit" className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', height: '44px' }}>
            {loading
              ? <><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></>
              : <><UserPlus size={16}/> Register {role === 'admin' ? 'Admin' : 'Student'}</>
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
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: 'var(--bg-main)' },
  glowOrb: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, var(--shadow-glow), transparent 70%)', pointerEvents: 'none' },
  card: { width: '100%', maxWidth: '440px', padding: '2.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', position: 'relative', zIndex: 1 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  logoIcon: { width: '42px', height: '42px', borderRadius: '12px', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px var(--shadow-glow)' },
  logoText: { fontSize: '1.7rem', fontWeight: '800', color: 'var(--text-primary)' },
  tagline: { color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-0.25rem' },
  roleToggleWrap: { display: 'flex', background: 'var(--bg-card)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-color)', gap: '4px', marginTop: '0.25rem' },
  roleTab: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  roleTabActive: { background: 'var(--bg-panel)', color: 'var(--accent-green)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: { fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  note: { fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' },
  switchText: { textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' },
  link: { color: 'var(--accent-green)', textDecoration: 'none', fontWeight: '700' },
}
