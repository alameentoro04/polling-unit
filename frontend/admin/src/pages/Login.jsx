import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(username, password)
      if (user.role === 'agent') {
        setError('Agents must use the mobile app')
        return
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-title">Situation Room</div>
        <div className="login-subtitle">Bauchi State Polling Unit Monitoring</div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="label">Username</label>
            <input
              className="input w-full"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          <div className="mb-4">
            <label className="label">Password</label>
            <input
              className="input w-full"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          {error && (
            <div className="badge badge-red mb-3" style={{ width: '100%', justifyContent: 'center' }}>
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
