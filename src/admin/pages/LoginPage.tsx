import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CircleAlert, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { homePath, useAuth } from '../auth';
import { errorMessage } from '../api';
import { BrandMark } from '../components/AdminLayout';
import { Spinner } from '../components/ui';

export const HERO_IMAGE = 'https://www.themealdb.com/images/media/meals/xrttsx1487339558.jpg';

export default function LoginPage() {
  const { status, user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated' && user) return <Navigate to={homePath(user)} replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const signedIn = await login(email.trim(), password);
      navigate(homePath(signedIn), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="adm adm-login">
      <aside className="adm-login-hero" style={{ backgroundImage: `url(${HERO_IMAGE})` }}>
        <div className="adm-login-hero-content">
          <BrandMark />
          <div>
            <h2>Good food, well managed.</h2>
            <p>Admins run the menu, tables and team. Chefs see the orders. One login for both.</p>
          </div>
        </div>
      </aside>

      <main className="adm-login-panel">
        <form className="adm-login-card" onSubmit={handleSubmit} noValidate>
          <div className="adm-login-brand-mobile"><BrandMark /></div>
          <h1>Welcome back</h1>
          <p className="adm-login-sub">Log in as a restaurant admin or chef.</p>

          {error && (
            <div className="adm-alert" role="alert">
              <CircleAlert size={18} />
              {error}
            </div>
          )}

          <label className="adm-field">
            <span className="adm-label">Email</span>
            <span className="adm-input-wrap">
              <Mail size={18} className="adm-input-icon" />
              <input
                type="email"
                className="adm-input adm-input--icon"
                placeholder="you@restaurant.com"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </span>
          </label>

          <label className="adm-field">
            <span className="adm-label">Password</span>
            <span className="adm-input-wrap">
              <Lock size={18} className="adm-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="adm-input adm-input--icon adm-input--action"
                placeholder="Your password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="adm-input-action"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          <button type="submit" className="adm-btn adm-btn--primary adm-btn--block adm-btn--lg" disabled={submitting}>
            {submitting && <Spinner size={18} />}
            {submitting ? 'Logging in…' : 'Log in'}
          </button>

          <p className="adm-login-switch">
            New to the team? <Link to="/admin/register">Create an account</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
