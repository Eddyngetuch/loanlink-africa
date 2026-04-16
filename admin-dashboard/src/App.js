import React, { useState } from 'react';
import axios from 'axios';
import Users from './components/Users';
import Loans from './components/Loans';
import Payments from './components/Payments';
import ExportData from './components/ExportData';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/admin/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setError('');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  if (!token) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Admin Login</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={handleLogin}>
          <div><label>Email:</label><br /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '300px', padding: '8px', marginBottom: '10px' }} /></div>
          <div><label>Password:</label><br /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '300px', padding: '8px', marginBottom: '10px' }} /></div>
          <button type="submit" style={{ padding: '8px 16px' }}>Login</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Admin Dashboard</h2>
      <button onClick={handleLogout}>Logout</button>
      <ExportData token={token} />
      <Users token={token} />
      <Loans token={token} />
      <Payments token={token} />
    </div>
  );
}

export default App;
