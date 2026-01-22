// API proxy para manejar cookies correctamente usando http nativo (v2)
const http = require('http');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export default async function handler(req, res) {
  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path;
  const backendPath = `/api/${apiPath}`;

  return new Promise((resolve, reject) => {
    const isAuth = apiPath.includes('auth');
    
    if (isAuth) {
      console.log(`\n[PROXY] === ${req.method} ${backendPath} ===`);
      console.log(`[PROXY] Request cookies from browser:`, req.headers.cookie || '(none)');
      console.log(`[PROXY] Forwarding to backend...`);
    }
    
    // Preparar body si existe
    let bodyData = '';
    if (req.method !== 'GET' && req.method !== 'DELETE' && req.body) {
      bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const options = {
      hostname: 'localhost',
      port: 4000,
      path: backendPath,
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.cookie && { Cookie: req.headers.cookie }),
        ...(bodyData && { 'Content-Length': Buffer.byteLength(bodyData) }),
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      if (isAuth) {
        console.log(`[PROXY] Backend responded with status: ${proxyRes.statusCode}`);
        console.log(`[PROXY] Backend headers:`, proxyRes.headers);
      }

      // CRÍTICO: Forward Set-Cookie headers
      const setCookieHeaders = proxyRes.headers['set-cookie'];
      if (setCookieHeaders) {
        if (isAuth) {
          console.log(`[PROXY] ✓ Found Set-Cookie headers:`, setCookieHeaders);
          console.log(`[PROXY] ✓ Forwarding to client...`);
        }
        res.setHeader('Set-Cookie', setCookieHeaders);
      } else if (isAuth) {
        console.log(`[PROXY] ✗ No Set-Cookie header from backend`);
      }

      // Recopilar respuesta
      let data = '';
      proxyRes.on('data', (chunk) => {
        data += chunk;
      });

      proxyRes.on('end', () => {
        try {
          // Si la respuesta está vacía, devolver objeto vacío
          if (!data || data.trim() === '') {
            res.status(proxyRes.statusCode).json({});
            resolve();
            return;
          }
          
          // Intentar parsear como JSON
          const jsonData = JSON.parse(data);
          if (isAuth) {
            console.log(`[PROXY] ✓ Response forwarded successfully`);
          }
          res.status(proxyRes.statusCode).json(jsonData);
          resolve();
        } catch (error) {
          console.error('[PROXY] Error parsing JSON:', error);
          console.error('[PROXY] Response data:', data.substring(0, 200));
          // Si no es JSON, devolver como texto
          res.status(proxyRes.statusCode).send(data);
          resolve();
        }
      });
    });

    proxyReq.on('error', (error) => {
      console.error('[PROXY] Request error:', error);
      res.status(500).json({ error: error.message });
      resolve();
    });

    // Enviar body si existe
    if (bodyData) {
      proxyReq.write(bodyData);
    }
    proxyReq.end();
  });
}
