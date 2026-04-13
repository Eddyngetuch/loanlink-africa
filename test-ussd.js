const http = require('http');

const sessionId = 'flow1';
const phoneNumber = '254712345678';
const basePath = '/ussd/callback';

function sendRequest(text, callback) {
  const data = `sessionId=${sessionId}&serviceCode=*384*99673%23&phoneNumber=${phoneNumber}&text=${encodeURIComponent(text)}`;
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: basePath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  const req = http.request(options, (res) => {
    let response = '';
    res.on('data', chunk => response += chunk);
    res.on('end', () => {
      console.log(`Response for text="${text}":`, response);
      callback(response);
    });
  });
  req.on('error', (e) => console.error(`Error: ${e.message}`));
  req.write(data);
  req.end();
}

// Simulate the USSD flow
sendRequest('', (res1) => {
  // Step 1: Main menu, choose 1
  sendRequest('1', (res2) => {
    // Step 2: Enter ID
    sendRequest('1*12345678', (res3) => {
      // Step 3: Choose loan amount
      sendRequest('1*12345678*2', (res4) => {
        // Step 4: Accept fee
        sendRequest('1*12345678*2*1', (res5) => {
          console.log('Flow completed');
        });
      });
    });
  });
});
