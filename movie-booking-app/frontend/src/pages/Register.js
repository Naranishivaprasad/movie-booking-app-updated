import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name || form.name.length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name, email: form.email, password: form.password,
      });
      login(data.token, data.user);
      toast.success('Account created! Welcome 🎬');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: e => setForm(p => ({ ...p, [key]: e.target.value })),
    className: `input-field ${errors[key] ? 'error' : ''}`,
  });

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-box fade-up">
        <div className="auth-header">
          <div className="auth-logo">🎬</div>
          <h1>Create account</h1>
          <p>Join CineBook and start booking</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {errors.general && <div className="auth-error">{errors.general}</div>}

          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input type="text" placeholder="John Doe" {...field('name')} />
            {errors.name && <span className="error-msg">⚠ {errors.name}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <input type="email" placeholder="you@example.com" {...field('email')} />
            {errors.email && <span className="error-msg">⚠ {errors.email}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input type="password" placeholder="Min. 6 characters" {...field('password')} />
            {errors.password && <span className="error-msg">⚠ {errors.password}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Confirm Password</label>
            <input type="password" placeholder="Repeat password" {...field('confirmPassword')} />
            {errors.confirmPassword && <span className="error-msg">⚠ {errors.confirmPassword}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? <><span className="spinner" /> Creating account...</> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
