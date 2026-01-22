const http = require('http');

async function testProxyLogin() {
  console.log('\n[PROXY-TEST] === Testing login through proxy ===\n');
  
  const postData = JSON.stringify({ username: 'admin', password: 'admin' });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log('[PROXY-TEST] Response status:', res.statusCode);
      console.log('[PROXY-TEST] Response headers:');
      
      // Log todas los headers
      Object.entries(res.headers).forEach(([key, value]) => {
        if (key.toLowerCase() === 'set-cookie') {
          console.log(`  ✓ ${key}: ${Array.isArray(value) ? value.join('; ') : value}`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      
      res.on('end', () => {
        console.log('[PROXY-TEST] Response body:', data);
        const setCookie = res.headers['set-cookie'];
        console.log('[PROXY-TEST] Set-Cookie found?', setCookie ? '✓ YES' : '✗ NO');
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('[PROXY-TEST] Error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

testProxyLogin().then(() => {
  console.log('[PROXY-TEST] === Test complete ===\n');
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
