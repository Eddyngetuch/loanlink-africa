import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

const Loans = ({ token }) => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchLoans = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/loans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLoans(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load loans');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [token]);

  const updateLoanStatus = async (loanId, status) => {
    setActionLoading(loanId);
    try {
      await axios.put(`${API_URL}/api/admin/loans/${loanId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchLoans();
    } catch (err) {
      alert('Failed to update loan status');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div>Loading loans...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h3>Loans</h3>
      <table border="1" cellPadding="5" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>User ID</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Fee Paid</th>
            <th>Created</th>
            <th>Repaid At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loans.map(loan => (
            <tr key={loan.id}>
              <td>{loan.id}</td>
              <td>{loan.user_id}</td>
              <td>{loan.amount}</td>
              <td>{loan.status}</td>
              <td>{loan.fee_paid ? 'Yes' : 'No'}</td>
              <td>{new Date(loan.created_at).toLocaleString()}</td>
              <td>{loan.repaid_at ? new Date(loan.repaid_at).toLocaleString() : '-'}</td>
              <td>
                {(loan.status === 'pending' || loan.status === 'fee_paid') && (
                  <>
                    <button onClick={() => updateLoanStatus(loan.id, 'disbursed')} disabled={actionLoading === loan.id} style={{ marginRight: '5px' }}>
                      {actionLoading === loan.id ? '...' : 'Approve'}
                    </button>
                    <button onClick={() => updateLoanStatus(loan.id, 'rejected')} disabled={actionLoading === loan.id}>Reject</button>
                  </>
                )}
                {loan.status === 'disbursed' && (
                  <button onClick={() => updateLoanStatus(loan.id, 'repaid')} disabled={actionLoading === loan.id}>Mark Repaid</button>
                )}
                {(loan.status === 'repaid' || loan.status === 'rejected' || loan.status === 'expired') && (
                  <span>{loan.status === 'repaid' ? 'Repaid' : loan.status}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Loans;
