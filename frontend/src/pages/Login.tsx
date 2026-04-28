import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/auth-context';

export function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <section className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-primary">
          <ShieldCheck size={30} />
        </div>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-primary">GAMA Login</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-gray-950">Welcome Back</h1>
        <p className="mt-3 text-gray-500">Sign in with your Supabase email and password.</p>

        <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold text-gray-700">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-amber-500/10"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-gray-700">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-amber-500/10"
            />
          </label>

          {error && <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-primary px-5 py-3 font-bold text-white transition hover:bg-amber-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Continue'}
          </button>
        </form>
      </section>
    </main>
  );
}
