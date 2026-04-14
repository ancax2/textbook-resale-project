import React, { useState } from 'react';

const nbccTextbookLockup = process.env.PUBLIC_URL + '/brand/nbcctxtbook.svg';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        onLogin(data.user);
      } else {
        setError(
          data.message ||
            data.error ||
            (response.status >= 500
              ? 'Server error. Please try again later.'
              : 'Invalid email or password')
        );
      }
    } catch (err) {
      setError('Connection error. Make sure server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-nbcc-hero">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-10 text-center mb-4">
            <img
              className="mx-auto d-block mb-3"
              src={nbccTextbookLockup}
              alt="NBCC Textbook Resale"
              style={{ maxWidth: 'min(100%, 520px)', height: 'auto' }}
            />
            <p className="text-muted login-hero-tagline mb-1">
              Peer marketplace for NBCC students. A student project built with colours and type from the{' '}
              <a href="https://www.nbcc.ca" target="_blank" rel="noopener noreferrer">NBCC</a>
              {' '}visual identity.
            </p>
          </div>
          <div className="col-md-5 col-lg-4 login-card">
            <div className="card rounded-3">
              <div className="card-body p-4">
                <h2 className="h4 text-center mb-4" style={{ fontFamily: 'var(--nbcc-font-heading)' }}>Sign in</h2>
              
                {error && (
                  <div className="alert alert-danger app-alert" role="alert">
                    <span className="app-alert-icon" aria-hidden="true">⚠️</span>
                    <div className="app-alert-message">{error}</div>
                  </div>
                )}
              
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@mynbcc.ca"
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        />
                        Signing in…
                      </>
                    ) : (
                      'Login'
                    )}
                  </button>
                </form>
              
                <div className="mt-4 pt-3 border-top small text-muted text-center">
                  <p className="mb-2 fw-semibold">Demo accounts</p>
                  <p className="mb-0">john.doe@mynbcc.ca / password123</p>
                  <p className="mb-0">jane.smith@mynbcc.ca / password123</p>
                  <p className="mb-0">mike.wilson@mynbcc.ca / password123</p>
                  <p className="mb-0">sarah.jones@mynbcc.ca / password123</p>
                  <p className="mb-0">admin@nbcc.ca / admin123</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
