import { useState } from 'react'
import './App.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001').replace(/\/$/, '');

export default function AuthModal({ onAuthSuccess }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleFillDemo = () => {
    setMode('login')
    setEmail('analyst@sentinel.org')
    setPassword('SecurePassword2026!')
    setErrorMsg('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (mode === 'register') {
      if (!name.trim() || name.trim().length < 2) {
        setErrorMsg('Please enter your full name (at least 2 characters).')
        return
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.')
        return
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.')
        return
      }
    }

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.')
      return
    }

    setIsLoading(true)
    const endpoint = mode === 'register' ? `${API_BASE_URL}/api/auth/register` : `${API_BASE_URL}/api/auth/login`
    const payload = mode === 'register' 
      ? { name: name.trim(), email: email.trim().toLowerCase(), password } 
      : { email: email.trim().toLowerCase(), password }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed. Please try again.')
      }

      if (data.token && data.user) {
        onAuthSuccess({ token: data.token, user: data.user })
      } else {
        throw new Error('Invalid response from server.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unable to connect to authentication server.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        {/* Header Branding */}
        <div className="auth-header">
          <div className="auth-icon-wrap">
            <span className="auth-icon">🛡️</span>
          </div>
          <h2 className="auth-title">CyberSentinel</h2>
          <span className="auth-badge">Secure Access Gateway</span>
          <p className="auth-subtitle">
            AI-Powered Threat Defense & Incident Awareness Platform
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button 
            type="button" 
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setErrorMsg('') }}
          >
            Sign In
          </button>
          <button 
            type="button" 
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setErrorMsg('') }}
          >
            Create Account
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="auth-error-banner">
            <span className="error-icon">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="auth-field">
              <label>Full Name</label>
              <input 
                type="text" 
                placeholder="e.g. Nitya Patle"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="user@sentinel.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {mode === 'register' && (
            <div className="auth-field">
              <label>Confirm Password</label>
              <input 
                type="password" 
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? (
              <span>Authenticating...</span>
            ) : mode === 'login' ? (
              <span>Unlock CyberSentinel ➔</span>
            ) : (
              <span>Register & Launch ➔</span>
            )}
          </button>
        </form>

        {/* Quick Demo Fill & Footer */}
        <div className="auth-footer">
          <button type="button" className="demo-fill-btn" onClick={handleFillDemo}>
            ⚡ Quick Demo Login (1-Click)
          </button>
          <div className="auth-security-note">
            🔒 Passwords securely hashed with bcrypt | JWT Session Tokenization
          </div>
        </div>
      </div>
    </div>
  )
}
