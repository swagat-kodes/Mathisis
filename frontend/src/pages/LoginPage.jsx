import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'
import { BookOpen, LogIn, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)

    // 1. Authenticate with Supabase Auth
    const { data, error } = await signIn(form.email, form.password)
    if (error) {
      setLoading(false)
      return toast.error(error.message)
    }

    // 2. Fetch role directly from the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    setLoading(false)

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError)
      toast.error('Could not load your profile. Please try again.')
      return
    }

    // 3. Route based on actual DB role — no race condition
    if (profile.role === 'admin') {
      navigate('/admin', { replace: true })
    } else {
      navigate('/student', { replace: true })
    }
  }

  return (
    <div style={styles.page}>
      {/* Background orbs */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <div className="glass fade-in-up" style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>
            <BookOpen size={28} color="#60a5fa" />
          </div>
          <h1 style={styles.logoText} className="gradient-text">Mathisis</h1>
        </div>
        <p style={styles.tagline}>AI-powered learning for engineers</p>

        <h2 style={styles.heading}>Welcome back</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Email</label>
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

          <button id="login-submit" className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading
              ? <><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></>
              : <><LogIn size={16}/> Sign In</>
            }
          </button>
        </form>

        <p style={styles.switchText}>
          Don't have an account?{' '}
          <Link to="/signup" style={styles.link}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--bg-base)',
  },
  orb1: {
    position: 'absolute', top: '-100px', left: '-100px',
    width: '500px', height: '500px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)',
    pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute', bottom: '-150px', right: '-100px',
    width: '500px', height: '500px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%', maxWidth: '420px', padding: '2.5rem',
    display: 'flex', flexDirection: 'column', gap: '1rem',
    position: 'relative', zIndex: 1,
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  logoIcon: {
    width: '44px', height: '44px', borderRadius: '12px',
    background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))',
    border: '1px solid rgba(59,130,246,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontFamily: "'Outfit', sans-serif", fontSize: '1.75rem', fontWeight: '800' },
  tagline: { color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-0.5rem' },
  heading: { fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  label: { fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  switchText: { textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' },
  link: { color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' },
}
