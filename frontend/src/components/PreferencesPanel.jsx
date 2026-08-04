import { useState, useEffect } from 'react'
import { Settings, Moon, Sun, AlignLeft, FileText, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PreferencesPanel({
  theme, setTheme,
  answerStyle, setAnswerStyle
}) {
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('mathisis_theme', newTheme)
    toast.success(`Theme switched to ${newTheme.toUpperCase()} mode`)
  }

  const handleStyleChange = (newStyle) => {
    setAnswerStyle(newStyle)
    localStorage.setItem('mathisis_answer_style', newStyle)
    toast.success(`AI answers set to ${newStyle.toUpperCase()} mode`)
  }

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Settings size={20} color="var(--accent-green)" />
          <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
            Preferences & Settings
          </span>
        </div>
      </div>

      <div style={styles.content}>
        {/* Feature 1: Theme Mode */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.sectionTitle}>1. Application Theme</h3>
              <p style={styles.sectionDesc}>Choose between dark or light appearance. Default is Dark.</p>
            </div>
          </div>

          <div style={styles.cardGrid}>
            <div
              className="option-card-hover"
              onClick={() => handleThemeChange('dark')}
              style={{
                ...styles.optionCard,
                ...(theme === 'dark' ? styles.optionCardActive : {})
              }}
            >
              <div style={styles.optionIcon}>
                <Moon size={22} color={theme === 'dark' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={styles.optionName}>Dark Mode (Default)</h4>
                <p style={styles.optionMeta}>Sleek dark panel theme for easy night studying</p>
              </div>
              {theme === 'dark' && <Check size={18} color="var(--accent-green)" />}
            </div>

            <div
              className="option-card-hover"
              onClick={() => handleThemeChange('light')}
              style={{
                ...styles.optionCard,
                ...(theme === 'light' ? styles.optionCardActive : {})
              }}
            >
              <div style={styles.optionIcon}>
                <Sun size={22} color={theme === 'light' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={styles.optionName}>Light Mode</h4>
                <p style={styles.optionMeta}>Clean high-contrast theme for bright environments</p>
              </div>
              {theme === 'light' && <Check size={18} color="var(--accent-green)" />}
            </div>
          </div>
        </div>

        {/* Feature 2: Answer Length / Detail Level */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.sectionTitle}>2. AI Answer Detail Level</h3>
              <p style={styles.sectionDesc}>Select how Mathisis AI formats its textbook explanations. Default is Detailed.</p>
            </div>
          </div>

          <div style={styles.cardGrid}>
            <div
              className="option-card-hover"
              onClick={() => handleStyleChange('concise')}
              style={{
                ...styles.optionCard,
                ...(answerStyle === 'concise' ? styles.optionCardActive : {})
              }}
            >
              <div style={styles.optionIcon}>
                <AlignLeft size={22} color={answerStyle === 'concise' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={styles.optionName}>Concise</h4>
                <p style={styles.optionMeta}>Direct, point-to-point answers focused on key facts</p>
              </div>
              {answerStyle === 'concise' && <Check size={18} color="var(--accent-green)" />}
            </div>

            <div
              className="option-card-hover"
              onClick={() => handleStyleChange('detailed')}
              style={{
                ...styles.optionCard,
                ...(answerStyle === 'detailed' ? styles.optionCardActive : {})
              }}
            >
              <div style={styles.optionIcon}>
                <FileText size={22} color={answerStyle === 'detailed' ? 'var(--accent-green)' : 'var(--text-muted)'} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={styles.optionName}>Detailed (Default)</h4>
                <p style={styles.optionMeta}>In-depth, step-by-step explanations with derivations</p>
              </div>
              {answerStyle === 'detailed' && <Check size={18} color="var(--accent-green)" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  panel: { display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, background: 'var(--bg-panel)', overflow: 'hidden' },
  header: { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-panel)' },
  content: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.5rem', maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' },
  section: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' },
  sectionDesc: { fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' },
  cardGrid: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  optionCard: { padding: '1rem 1.25rem', borderRadius: '14px', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s' },
  optionCardActive: { borderColor: 'var(--accent-green)', background: 'var(--bg-hover)' },
  optionIcon: { width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  optionName: { fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)' },
  optionMeta: { fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' },
}
