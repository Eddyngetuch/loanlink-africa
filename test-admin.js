const http = require('http');

const data = JSON.stringify({
  email: 'admin@loanlink.co.ke',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let response = '';
  res.on('data', (chunk) => response += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', response);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
