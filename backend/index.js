const express = require('express');
const cors = require('cors');
const { Client } = require('ssh2');

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint para probar conexión SSH y obtener datos básicos
app.post('/api/firewalls/test', async (req, res) => {
  const { host, port, user, password, key } = req.body;
  const conn = new Client();
  let result = { success: false, error: null, data: null };

  conn.on('ready', () => {
    // Ejecutar comandos básicos de pfSense (ejemplo: uptime, top, ifconfig)
    conn.exec('uptime && top -bn1 | head -n 5 && ifconfig', (err, stream) => {
      if (err) {
        result.error = 'Error ejecutando comandos';
        conn.end();
        return res.json(result);
      }
      let output = '';
      stream.on('close', (code, signal) => {
        result.success = true;
        result.data = output;
        conn.end();
        return res.json(result);
      }).on('data', (data) => {
        output += data.toString();
      }).stderr.on('data', (data) => {
        result.error = data.toString();
      });
    });
  }).on('error', (err) => {
    result.error = 'SSH: ' + err.message;
    return res.json(result);
  }).connect({
    host,
    port: Number(port) || 22,
    username: user,
    password: password || undefined,
    privateKey: key || undefined,
    readyTimeout: 10000
  });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Backend SSH API running on port ${PORT}`);
});
