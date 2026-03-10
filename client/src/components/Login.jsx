import React, { useState } from 'react';

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
      
      const data = await response.json();
      
      if (data.success) {
        onLogin(data.user);
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Connection error. Make sure server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h3 className="text-center mb-4">📚 Textbook Resale</h3>
              <h5 className="text-center mb-4 text-muted">Login</h5>
              
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
                      ></span>
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
              </form>
              
              <div className="mt-4 text-center small text-muted">
                <p className="mb-1"><strong>Test Accounts:</strong></p>
                <p className="mb-0">john.doe@mynbcc.ca / password123</p>
                <p className="mb-0">jane.smith@mynbcc.ca / password123</p>
                <p className="mb-0">admin@nbcc.ca / admin123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;