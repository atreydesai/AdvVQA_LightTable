import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch {
      setError('Sign-in failed. Check your username and password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="login-card" onSubmit={submit}>
      <h1>Light Table</h1>
      <p className="muted small">
        Question version history for AdvVQA. Sign in with your editor account.
      </p>
      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoFocus
        autoComplete="username"
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      {error && <div className="error">{error}</div>}
      <button className="btn primary" disabled={busy || !username || !password}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
