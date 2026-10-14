import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ChefHat, CircleAlert, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, Store, User } from 'lucide-react';
import { homePath, useAuth } from '../auth';
import { errorMessage } from '../api';
import { BrandMark } from '../components/AdminLayout';
import { Spinner } from '../components/ui';
import type { StaffRole } from '../types';
import { HERO_IMAGE } from './LoginPage';

const MIN_PASSWORD_LENGTH = 8;
const RESTAURANT_CODE_LENGTH = 6;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const ROLE_OPTIONS: { value: StaffRole; label: string; hint: string; icon: typeof ChefHat }[] = [
  { value: 'admin', label: 'Restaurant admin', hint: 'Set up a restaurant', icon: ShieldCheck },
  { value: 'chef', label: 'Chef', hint: 'Join a kitchen', icon: ChefHat },
];

export default function RegisterPage() {
  const { status, user, register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<StaffRole>('admin');
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantCode, setRestaurantCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated' && user) return <Navigate to={homePath(user)} replace />;

  const isAdmin = role === 'admin';

  const validate = () => {
    if (isAdmin && !restaurantName.trim()) return 'Enter your restaurant name.';
    if (!isAdmin && restaurantCode.trim().length !== RESTAURANT_CODE_LENGTH) {
      return `Enter the ${RESTAURANT_CODE_LENGTH}-character restaurant code from your admin.`;
    }
    if (!name.trim()) return 'Enter your name.';
    if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.';
    if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    return '';
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const signedIn = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        ...(isAdmin ? { restaurantName: restaurantName.trim() } : { restaurantCode: restaurantCode.trim() }),
      });
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
            <h2>Your restaurant, one dashboard.</h2>
            <p>Admins set up the restaurant and share its code. Chefs join with that code and see the orders.</p>
          </div>
        </div>
      </aside>

      <main className="adm-login-panel">
        <form className="adm-login-card" onSubmit={handleSubmit} noValidate>
          <div className="adm-login-brand-mobile"><BrandMark /></div>
          <h1>Create an account</h1>
          <p className="adm-login-sub">Choose your role to get started.</p>

          {error && (
            <div className="adm-alert" role="alert">
              <CircleAlert size={18} />
              {error}
            </div>
          )}

          <div className="adm-field">
            <span className="adm-label" id="register-role-label">I am a</span>
            <div className="adm-role-picker" role="radiogroup" aria-labelledby="register-role-label">
              {ROLE_OPTIONS.map(({ value, label, hint, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={role === value}
                  className={`adm-role-option ${role === value ? 'is-selected' : ''}`}
                  onClick={() => {
                    setRole(value);
                    setError('');
                  }}
                >
                  <span className="adm-role-icon"><Icon size={20} /></span>
                  <span className="adm-role-text">
                    <strong>{label}</strong>
                    <span>{hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {isAdmin ? (
            <label className="adm-field">
              <span className="adm-label">Restaurant name</span>
              <span className="adm-input-wrap">
                <Store size={18} className="adm-input-icon" />
                <input
                  className="adm-input adm-input--icon"
                  placeholder="e.g. Spice Garden"
                  autoComplete="organization"
                  maxLength={100}
                  value={restaurantName}
                  onChange={e => setRestaurantName(e.target.value)}
                />
              </span>
            </label>
          ) : (
            <label className="adm-field">
              <span className="adm-label">Restaurant code</span>
              <span className="adm-input-wrap">
                <KeyRound size={18} className="adm-input-icon" />
                <input
                  className="adm-input adm-input--icon adm-input--code"
                  placeholder="e.g. K7M2QX"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={RESTAURANT_CODE_LENGTH}
                  value={restaurantCode}
                  onChange={e => setRestaurantCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                />
              </span>
              <span className="adm-hint">Ask your restaurant admin. It's on their Team page.</span>
            </label>
          )}

          <label className="adm-field">
            <span className="adm-label">Full name</span>
            <span className="adm-input-wrap">
              <User size={18} className="adm-input-icon" />
              <input
                className="adm-input adm-input--icon"
                placeholder="Your name"
                autoComplete="name"
                maxLength={80}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </span>
          </label>

          <label className="adm-field">
            <span className="adm-label">Email</span>
            <span className="adm-input-wrap">
              <Mail size={18} className="adm-input-icon" />
              <input
                type="email"
                className="adm-input adm-input--icon"
                placeholder="you@restaurant.com"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
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
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                autoComplete="new-password"
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
            {submitting ? 'Creating account…' : isAdmin ? 'Create restaurant account' : 'Join kitchen'}
          </button>

          <p className="adm-login-switch">
            Already have an account? <Link to="/admin/login">Log in</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
