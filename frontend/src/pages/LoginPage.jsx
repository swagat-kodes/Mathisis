import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'
import { Sparkles, LogIn, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await signIn(form.email, form.password)
    if (error) {
      setLoading(false)
      return toast.error(error.message)
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    setLoading(false)

    if (profileError || !profile) {
      toast.error('Could not load profile. Routing to student dashboard.')
      navigate('/student', { replace: true })
      return
    }

    if (profile.role === 'admin') {
      navigate('/admin', { replace: true })
    } else {
      navigate('/student', { replace: true })
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.glowOrb} />

      <div className="glass fade-in-up" style={styles.card}>
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>
            <Sparkles size={24} color="#0B0C10" />
          </div>
          <h1 style={styles.logoText}>Mathisis AI</h1>
        </div>
        <p style={styles.tagline}>Smart, Personalized Engineering AI Companion</p>

        <h2 style={styles.heading}>Welcome back</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrap}>
              <Mail size={16} style={styles.inputIcon} />
              <input
                id="login-email"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                type="email"
                name="email"
                placeholder="you@university.edu"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrap}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                id="login-password"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button id="login-submit" className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem', height: '44px' }}>
            {loading
              ? <><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></>
              : <><LogIn size={16}/> Sign In</>
            }
          </button>
        </form>

        <p style={styles.switchText}>
          Don't have an account?{' '}
          <Link to="/signup" style={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: 'var(--bg-main)' },
  glowOrb: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, var(--shadow-glow), transparent 70%)', pointerEvents: 'none' },
  card: { width: '100%', maxWidth: '420px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 1 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  logoIcon: { width: '44px', height: '44px', borderRadius: '12px', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px var(--shadow-glow)' },
  logoText: { fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)' },
  tagline: { color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-0.5rem' },
  heading: { fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  label: { fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  switchText: { textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' },
  link: { color: 'var(--accent-green)', textDecoration: 'none', fontWeight: '700' },
}
