import { Sparkles } from 'lucide-react'

export default function LoadingScreen({ message = 'Loading Mathisis AI...' }) {
  return (
    <div style={styles.container}>
      {/* Background Ambient Glow */}
      <div style={styles.glowOrb} />

      <div className="glass fade-in-up" style={styles.card}>
        {/* Animated Pulsing Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>
            <Sparkles size={28} color="#0B0C10" />
          </div>
        </div>

        {/* Title */}
        <h1 style={styles.title}>Mathisis AI</h1>
        <p style={styles.subtitle}>Smart Engineering Companion</p>

        {/* Animated Loading Bar */}
        <div style={styles.progressTrack}>
          <div style={styles.progressBar} />
        </div>

        {/* Pulsing Dots & Message */}
        <div style={styles.messageRow}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
          <span style={styles.messageText}>{message}</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-main)',
    position: 'relative',
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, var(--shadow-glow), transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    padding: '2.5rem 3rem',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '0.75rem',
    width: '100%',
    maxWidth: '360px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  logoWrap: {
    marginBottom: '0.5rem',
  },
  logoIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'var(--accent-green)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 24px var(--shadow-glow)',
    animation: 'pulse 2s infinite ease-in-out',
  },
  title: {
    fontFamily: "'Verdana', 'Geneva', sans-serif",
    fontSize: '1.5rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '-0.35rem',
  },
  progressTrack: {
    width: '100%',
    height: '4px',
    borderRadius: '4px',
    background: 'var(--bg-card)',
    overflow: 'hidden',
    marginTop: '1rem',
    position: 'relative',
    border: '1px solid var(--border-color)',
  },
  progressBar: {
    height: '100%',
    width: '60%',
    background: 'var(--accent-green)',
    borderRadius: '4px',
    boxShadow: '0 0 10px var(--accent-green)',
    animation: 'loadingSlide 1.5s infinite ease-in-out',
  },
  messageRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  messageText: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
}
