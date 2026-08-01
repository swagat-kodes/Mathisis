import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '12px' }}>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to={profile?.role === 'admin' ? '/admin' : '/student'} replace />
  }

  return children
}
