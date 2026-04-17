import React from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

const ExportData = ({ token }) => {
  const exportToCSV = async (type) => {
    let url = '';
    let filename = '';
    switch (type) {
      case 'users': url = '/api/admin/users'; filename = 'users.csv'; break;
      case 'loans': url = '/api/admin/loans'; filename = 'loans.csv'; break;
      case 'payments': url = '/api/admin/payments'; filename = 'payments.csv'; break;
      default: return;
    }
    try {
      const res = await axios.get(`${API_URL}${url}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      if (!data.length) { alert('No data to export'); return; }
      const headers = Object.keys(data[0]);
      const csvRows = [];
      csvRows.push(headers.join(','));
      for (const row of data) {
        const values = headers.map(header => {
          let val = row[header];
          if (val === null || val === undefined) val = '';
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            val = val.replace(/"/g, '""');
            val = `"${val}"`;
          }
          return val;
        });
        csvRows.push(values.join(','));
      }
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert('Failed to export data');
    }
  };

  return (
    <div style={{ margin: '20px 0' }}>
      <h3>Export Data</h3>
      <button onClick={() => exportToCSV('users')} style={{ marginRight: '10px' }}>Export Users</button>
      <button onClick={() => exportToCSV('loans')} style={{ marginRight: '10px' }}>Export Loans</button>
      <button onClick={() => exportToCSV('payments')}>Export Payments</button>
    </div>
  );
};

export default ExportData;
