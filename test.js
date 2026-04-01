const http = require('http');

const data = JSON.stringify({
  email: 'admin@loanlink.co.ke',
  password: 'admin123'
});

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/admin/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let response = '';
  res.on('data', chunk => response += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', response);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  console.error('Error code:', e.code);
});

req.write(data);
req.end();
