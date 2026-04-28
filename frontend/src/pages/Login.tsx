import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password, { keepLoggedIn });
      navigate('/dashboard', { replace: true });
    } catch (loginError: any) {
      setError(
        loginError.response?.data?.message ??
          loginError.message ??
          'Unable to sign in. Please check your credentials.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card card">
        <div className="auth-monogram" aria-hidden="true">
          G
        </div>

        <div className="auth-heading">
          <p className="academy-brand">GANESHA ACADEMY</p>
          <h1>Welcome back</h1>
          <p>Secure access for branch admins and front desk tablets.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={keepLoggedIn}
              onChange={(event) => setKeepLoggedIn(event.target.checked)}
            />
            <span>Keep me logged in for 30 days</span>
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="primary-button login-button" type="submit" disabled={isLoading}>
            {isLoading && <span className="gold-spinner" aria-hidden="true" />}
            <span>{isLoading ? 'Opening dashboard' : 'Enter Dashboard'}</span>
          </button>
        </form>
      </section>
    </main>
  );
}
