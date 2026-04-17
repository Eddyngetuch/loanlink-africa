import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

const Payments = ({ token }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/admin/payments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPayments(res.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load payments');
        setLoading(false);
      }
    };
    fetchPayments();
  }, [token]);

  if (loading) return <div>Loading payments...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h3>Payments</h3>
      <table border="1" cellPadding="5" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>User ID</th>
            <th>Loan ID</th>
            <th>Amount</th>
            <th>Type</th>
            <th>M-Pesa Receipt</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.user_id}</td>
              <td>{p.loan_id}</td>
              <td>{p.amount}</td>
              <td>{p.type}</td>
              <td>{p.mpesa_receipt || '-'}</td>
              <td>{p.status}</td>
              <td>{new Date(p.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Payments;
