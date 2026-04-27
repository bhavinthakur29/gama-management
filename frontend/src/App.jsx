import { useState } from 'react'
import { api } from './lib/api'
import './App.css'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepLoggedIn, setKeepLoggedIn] = useState(true)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const getBranchId = async (loginData, token) => {
    const directBranchId =
      loginData.branch_id ??
      loginData.profile?.branch_id ??
      loginData.user?.user_metadata?.branch_id ??
      loginData.user?.app_metadata?.branch_id

    if (directBranchId) {
      return directBranchId
    }

    const profilesResponse = await api.get('/auth/profiles', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return profilesResponse.data?.profiles?.[0]?.branch_id ?? null
  }

  const getUserRole = (loginData) => (
    loginData.role ??
    loginData.profile?.role ??
    loginData.user?.user_metadata?.role ??
    loginData.user?.app_metadata?.role
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      })
      const { access_token: token, refresh_token: refreshToken, expires_at: backendExpiry } = response.data

      if (!token) {
        throw new Error('Login succeeded but no token was returned.')
      }

      const branchId = await getBranchId(response.data, token)
      const role = getUserRole(response.data)
      const expiresAt = keepLoggedIn
        ? backendExpiry ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

      localStorage.setItem('gama_token', token)
      localStorage.setItem('gama_token_expires_at', expiresAt)

      if (refreshToken && keepLoggedIn) {
        localStorage.setItem('gama_refresh_token', refreshToken)
      } else {
        localStorage.removeItem('gama_refresh_token')
      }

      if (branchId) {
        localStorage.setItem('gama_branch_id', String(branchId))
      }

      if (role) {
        localStorage.setItem('gama_role', role)
      }

      if (role === 'Admin') {
        window.location.assign('/dashboard')
        return
      }

      window.location.assign('/dashboard')
    } catch (loginError) {
      const message =
        loginError.response?.data?.message ??
        loginError.message ??
        'Unable to sign in. Please check your credentials.'

      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">
          <span>G</span>
        </div>

        <div className="login-heading">
          <p className="eyebrow">Ganesha Academy</p>
          <h1 id="login-title">Academy Login</h1>
          <p>Secure access for branch admins and front desk tablets.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="academy@gama.in"
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>

          <label className="keep-row">
            <input
              type="checkbox"
              checked={keepLoggedIn}
              onChange={(event) => setKeepLoggedIn(event.target.checked)}
            />
            <span>Keep me logged in for 30 days</span>
          </label>

          {error && <p className="login-error" role="alert">{error}</p>}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Opening Dojo...' : 'Enter Dashboard'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default App
