import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/recipes');
    } catch {
      setError('Invalid username or password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.brandArea}>
          <span className={styles.logoIcon}>🍳</span>
          <h1 className={styles.title}>RecipeBook</h1>
          <p className={styles.tagline}>Your personal recipe planner</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">Username</label>
            <input id="username" name="username" type="text" className={styles.input} autoFocus />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className={styles.input} />
          </div>

          <button type="submit" className={styles.btn} disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
