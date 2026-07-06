import { useState } from 'react';
import { motion } from 'framer-motion';
import { signUp, signIn } from '../firebase/firebase';
import { useConnectivity } from '../hooks/useConnectivity';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import './SignUpScreen.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'That email already has an account — try signing in.',
  'auth/invalid-email': 'That doesn\'t look like a valid email address.',
  'auth/weak-password': 'Password is too weak — use at least 6 characters.',
  'auth/user-not-found': 'No account found for that email — try signing up.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/too-many-requests': 'Too many attempts — wait a moment and try again.',
};

function mapFirebaseError(err) {
  return ERROR_MESSAGES[err.code] ?? 'Something went wrong — please try again.';
}

function validate(mode, { email, password, confirmPassword }) {
  const errors = {};
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (password.length < 6) errors.password = 'Password must be at least 6 characters.';
  if (mode === 'signup' && password !== confirmPassword) {
    errors.confirmPassword = 'Passwords don\'t match.';
  }
  return errors;
}

export function SignUpScreen() {
  const [mode, setMode] = useState('signup'); // signup | signin
  const [fields, setFields] = useState({ email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isOnline = useConnectivity();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const validation = validate(mode, fields);
    setErrors(validation);
    setFormError('');
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp(fields.email, fields.password);
      } else {
        await signIn(fields.email, fields.password);
      }
      // onAuthStateChanged (useAuth) picks up the new session and the
      // route guard in App.jsx redirects away from here.
    } catch (err) {
      setFormError(mapFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === 'signup' ? 'signin' : 'signup'));
    setErrors({});
    setFormError('');
  };

  return (
    <div className="signup-screen">
      <motion.div
        className="signup-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="signup-card__logo">StreamDeck</h1>
        <h2 className="signup-card__title">{mode === 'signup' ? 'Create your account' : 'Sign in'}</h2>

        <form className="signup-card__form" onSubmit={handleSubmit} noValidate>
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            value={fields.email}
            onChange={handleChange}
            error={errors.email}
            disabled={submitting}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={fields.password}
            onChange={handleChange}
            error={errors.password}
            disabled={submitting}
          />
          {mode === 'signup' && (
            <Input
              label="Confirm password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={fields.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              disabled={submitting}
            />
          )}

          {formError && <p className="signup-card__form-error">{formError}</p>}
          {!isOnline && <p className="signup-card__offline-note">Sign-in needs a connection.</p>}

          <Button type="submit" size="lg" disabled={submitting || !isOnline}>
            {submitting ? <Spinner size={16} /> : mode === 'signup' ? 'Sign up' : 'Sign in'}
          </Button>
        </form>

        <button type="button" className="signup-card__toggle" onClick={toggleMode}>
          {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </motion.div>
    </div>
  );
}
