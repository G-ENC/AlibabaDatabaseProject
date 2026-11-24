import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form.username, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <article>
      <h1>Create an account</h1>
      <form onSubmit={submit}>
        <label>Username <input value={form.username} onChange={set('username')} autoFocus required /></label>
        <label>Email <input type="email" value={form.email} onChange={set('email')} required /></label>
        <label>Password (min. 6 characters) <input type="password" value={form.password} onChange={set('password')} required /></label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Register</button>
      </form>
      <p>Already registered? <Link to="/login">Log in</Link></p>
    </article>
  );
}
