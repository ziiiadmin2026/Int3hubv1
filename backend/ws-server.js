const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const { Client } = require('ssh2');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const db = require('./db');
const sshUtils = require('./ssh-utils');
const auth = require('./auth');

const app = express();
app.use(cors({ 
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], 
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, pid: process.pid, ts: Date.now() });
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`\n[BACKEND] POST /api/auth/login - username: ${username}`);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password requeridos' });
    }

    const user = db.getUserByUsername(username);
    if (!user) {
      console.log('[BACKEND]   ✗ Usuario no encontrado');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await auth.verifyPassword(password, user.passwordHash);
    if (!valid) {
      console.log('[BACKEND]   ✗ Password inválida');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = auth.generateToken(user.id, user.username, user.role);
    const cookieValue = `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    
    console.log('[BACKEND]   ✓ Password válida');
    console.log('[BACKEND] Setting cookie:', cookieValue.substring(0, 50) + '...');
    
    res.setHeader('Set-Cookie', cookieValue);
    
    // Verificar que se estableció
    const setCookieHeader = res.getHeader('Set-Cookie');
    console.log('[BACKEND] Response Set-Cookie header is now set:', !!setCookieHeader);
    
    res.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
    console.log('[BACKEND] ✓ Login response sent');
  } catch (err) {
    console.error('[BACKEND] Error en login:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  // Limpiar la cookie estableciendo Max-Age=0 y también vaciando el valor
  res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const decoded = auth.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const user = db.getUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (err) {
    console.error('[Auth] Error en /me:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// User Management Routes (Protected)
// ============================================================================

// Get all users
app.get('/api/users', auth.authMiddleware, (req, res) => {
  try {
    // Verificar que el usuario es admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    
    const users = db.getAllUsers();
    res.json({ users });
  } catch (err) {
    console.error('[Users] Error obteniendo usuarios:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create user
app.post('/api/users', auth.authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    
    const { username, password, email, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password son requeridos' });
    }
    
    // Verificar que no exista el usuario
    const existing = db.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    
    const id = Date.now().toString();
    const passwordHash = await auth.hashPassword(password);
    
    const user = db.createUser(id, username, passwordHash, email, role || 'user');
    res.json({ success: true, user });
  } catch (err) {
    console.error('[Users] Error creando usuario:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user
app.put('/api/users/:id', auth.authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    // Si se está cambiando el password
    if (updates.password) {
      const passwordHash = await auth.hashPassword(updates.password);
      db.updateUserPassword(id, passwordHash);
      delete updates.password;
    }
    
    // Actualizar otros campos
    if (Object.keys(updates).length > 0) {
      const user = db.updateUser(id, updates);
      return res.json({ success: true, user });
    }
    
    const user = db.getUserById(id);
    res.json({ success: true, user });
  } catch (err) {
    console.error('[Users] Error actualizando usuario:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete user
app.delete('/api/users/:id', auth.authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    
    const { id } = req.params;
    
    // No permitir eliminar el propio usuario
    if (id === req.user.userId) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }
    
    const deleted = db.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[Users] Error eliminando usuario:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Las rutas de firewalls están protegidas más abajo individualmente
// ============================================================================

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Anti-martilleo: deduplicación + cooldown/backoff por firewall
const CONNECT_COOLDOWN_MS = Number(process.env.CONNECT_COOLDOWN_MS || 15000);
const CONNECT_FAIL_BACKOFF_BASE_MS = Number(process.env.CONNECT_FAIL_BACKOFF_BASE_MS || 15000);
const CONNECT_FAIL_BACKOFF_MAX_MS = Number(process.env.CONNECT_FAIL_BACKOFF_MAX_MS || 300000);

const connectStates = new Map();
function getConnectState(id) {
  if (!connectStates.has(id)) {
    connectStates.set(id, {
      inFlight: null,
      lastAttemptAt: 0,
      lastSuccessAt: 0,
      lastFailAt: 0,
      failCount: 0,
    });
  }
  return connectStates.get(id);
}

function computeRetryAfterMs(state, now) {
  // Backoff por fallos
  if (state.failCount > 0 && state.lastFailAt) {
    const exp = Math.min(6, Math.max(0, state.failCount - 1));
    const backoff = Math.min(
      CONNECT_FAIL_BACKOFF_MAX_MS,
      CONNECT_FAIL_BACKOFF_BASE_MS * Math.pow(2, exp)
    );
    const next = state.lastFailAt + backoff;
    return next > now ? next - now : 0;
  }

  // Cooldown general entre intentos (para evitar floods aunque esté online)
  if (state.lastAttemptAt) {
    const next = state.lastAttemptAt + CONNECT_COOLDOWN_MS;
    return next > now ? next - now : 0;
  }

  return 0;
}

function humanBytes(bytes) {
  if (!bytes && bytes !== 0) return null;
  const units = ['B','KB','MB','GB','TB'];
  let i = 0;
  let n = Number(bytes);
  while (n >= 1024 && i < units.length-1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}

function parsePfSenseOutput(buf) {
  const lines = buf.split(/\r?\n/);
  const summary = { uptime: null, ips: [], interfaces: [], gateway: null, uname: null, cpuCount: null, memory: null, disk: null, raw: buf };

  // Uptime / load
  const upLine = lines.find(l => /load averages?:/i.test(l) || /up\s+/i.test(l));
  if (upLine) summary.uptime = upLine.trim();

  // uname / OS line
  const unameLine = lines.find(l => /FreeBSD|pfSense|Darwin|Linux/i.test(l));
  if (unameLine) summary.uname = unameLine.trim();

  // sysctl hw.ncpu or hw.physmem lines
  lines.forEach(l => {
    const mCpu = l.match(/hw\.ncpu[:\s]+(\d+)/i);
    if (mCpu) summary.cpuCount = Number(mCpu[1]);
    const mMem = l.match(/hw\.physmem[:\s]+(\d+)/i);
    if (mMem) summary.memory = humanBytes(Number(mMem[1]));
    const mDf = l.match(/^\/dev\/[\w\d]+\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d+)%\s+\//);
    if (mDf) summary.disk = { size: mDf[1], used: mDf[2], avail: mDf[3], percent: mDf[4] + '%' };
  });

  // Interface parsing: look for lines like 're0: flags=' then subsequent 'inet ' lines
  let currentIface = null;
  for (const l of lines) {
    const ifaceMatch = l.match(/^([a-zA-Z0-9_]+): flags=/);
    if (ifaceMatch) { currentIface = ifaceMatch[1]; continue; }
    if (currentIface) {
      const inetMatch = l.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
      if (inetMatch) {
        summary.interfaces.push({ iface: currentIface, ip: inetMatch[1] });
        summary.ips.push(inetMatch[1]);
      }
    }
  }

  // Gateway from netstat -rn section: look for 'default' or '0.0.0.0'
  const netstatLine = lines.find(l => /^default\s+/i.test(l) || /^0\.0\.0\.0\s+/i.test(l));
  if (netstatLine) {
    const parts = netstatLine.trim().split(/\s+/);
    if (parts.length >= 2) summary.gateway = parts[1];
  }

  // Fallback: first inet as main IP
  if (!summary.ips.length) {
    const fallback = buf.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
    if (fallback) { summary.ips.push(fallback[1]); }
  }

  return summary;
}

// WebSocket para logs SSH en tiempo real
io.on('connection', (socket) => {
  socket.on('ssh-connect', (params) => {
    const { host, port, user, password, key, command } = params;
    const conn = new Client();
    let connected = false;

    conn.on('ready', () => {
      connected = true;
      socket.emit('ssh-log', '[SSH] Conexión establecida. Abriendo shell...');

      // Open an interactive shell to keep the session alive and stream output
      conn.shell((err, stream) => {
        if (err) {
          socket.emit('ssh-log', '[SSH] Error abriendo shell: ' + err.message);
          socket.emit('ssh-end', { success: false, error: err.message });
          conn.end();
          return;
        }

        // Send a few initial commands to gather summary info suitable for pfSense (FreeBSD)
        const defaultCmds = [
          'uname -a',
          'uptime',
          'sysctl hw.ncpu',
          'sysctl hw.physmem',
          'ifconfig -a',
          'netstat -rn',
          'df -h /',
          'printf "__END__"'
        ];
        const buffer = '';
        stream.write(defaultCmds.join('; ') + '\n');
        let summaryEmitted = false;

        stream.on('data', (data) => {
          const text = data.toString();
          buffer += text;
          socket.emit('ssh-log', text);

          // After receiving initial block marker, parse summary once
          if (!summaryEmitted && buffer.includes('__END__')) {
            summaryEmitted = true;
            try {
              const summary = parsePfSenseOutput(buffer);
              socket.emit('ssh-summary', summary);
              socket.emit('ssh-end', { success: true });
            } catch (e) {
              socket.emit('ssh-log', '[PARSE] Error parsing summary: ' + e.message);
              socket.emit('ssh-summary', { raw: buffer });
              socket.emit('ssh-end', { success: true });
            }
          }
        });

        stream.stderr.on('data', (data) => {
          const text = data.toString();
          socket.emit('ssh-log', '[STDERR] ' + text);
        });

        // Let the client request commands over the socket
        socket.on('ssh-cmd', (c) => {
          if (stream.writable) stream.write(c + '\n');
        });

        socket.on('disconnect', () => {
          try { stream.end(); } catch(e){}
          conn.end();
        });
      });
    }).on('error', (err) => {
      if (!connected) {
        socket.emit('ssh-log', '[SSH] Error de conexión: ' + err.message);
        socket.emit('ssh-end', { success: false, error: err.message });
      }
    }).connect({
      host,
      port: Number(port) || 22,
      username: user,
      password: password || undefined,
      privateKey: key || undefined,
      readyTimeout: 10000
    });
  });
});

app.get('/', (req, res) => {
  res.send('SSH Backend WebSocket API running');
});

// ===== API ENDPOINTS FOR FIREWALL MANAGEMENT =====
// TODAS las rutas de firewalls están protegidas con authMiddleware

// GET all firewalls
app.get('/api/firewalls', auth.authMiddleware, (req, res) => {
  try {
    const firewalls = db.getAllFirewalls();
    res.json(firewalls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single firewall
app.get('/api/firewalls/:id', auth.authMiddleware, (req, res) => {
  try {
    const fw = db.getFirewall(req.params.id);
    if (!fw) return res.status(404).json({ error: 'Firewall not found' });
    res.json(fw);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create firewall
app.post('/api/firewalls', auth.authMiddleware, (req, res) => {
  try {
    const { id, name, host, port, user, password, key } = req.body;
    if (!id || !name || !host || !user) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const fw = db.addFirewall(id, { name, host, port, user, password, key });
    res.status(201).json(fw);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update firewall
app.put('/api/firewalls/:id', auth.authMiddleware, (req, res) => {
  try {
    const { name, host, port, user, password, key, status, summary, lastSeen } = req.body;
    const fw = db.updateFirewall(req.params.id, { name, host, port, user, password, key, status, summary, lastSeen });
    if (!fw) return res.status(404).json({ error: 'Firewall not found' });
    res.json(fw);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE firewall
app.delete('/api/firewalls/:id', auth.authMiddleware, (req, res) => {
  try {
    db.deleteFirewall(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update status/summary
app.patch('/api/firewalls/:id/status', (req, res) => {
  try {
    const { status, summary } = req.body;
    const fw = db.updateStatus(req.params.id, status, summary);
    res.json(fw);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET stats
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST connect and fetch pfSense stats
app.post('/api/firewalls/:id/connect', auth.authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const state = getConnectState(id);

    // Si ya hay un connect en vuelo, deduplicamos y retornamos el mismo resultado.
    if (state.inFlight) {
      const payload = await state.inFlight;
      return res.json({ ...payload, connectDeduped: true });
    }

    const now = Date.now();
    const retryAfterMs = computeRetryAfterMs(state, now);
    if (retryAfterMs > 0) {
      const current = db.getFirewall(id);
      if (!current) return res.status(404).json({ error: 'Firewall not found' });
      return res.json({
        ...current,
        connectAttempted: false,
        connectCooldown: true,
        retryAfterMs,
      });
    }

    const fw = db._getFirewallWithCredentials(id);
    if (!fw) return res.status(404).json({ error: 'Firewall not found' });

    console.log(`[SSH] Conectando a ${fw.name} (${fw.ip})...`);

    state.lastAttemptAt = now;

    state.inFlight = (async () => {
      try {
        // Execute SSH to fetch stats
        const result = await sshUtils.fetchPfSenseStats(
          fw.ip,
          fw.port || 22,
          fw.user,
          fw.password,
          fw.key
        );

        if (!result.success) {
          console.log(`[SSH] Error: ${result.error}`);
          state.failCount = Math.min(20, (state.failCount || 0) + 1);
          state.lastFailAt = Date.now();

          const prevSummary = fw.summary || null;
          const nextSummary = prevSummary
            ? { ...prevSummary, lastError: result.error || 'SSH connection failed', lastErrorAt: Date.now() }
            : { lastError: result.error || 'SSH connection failed', lastErrorAt: Date.now() };
          const updated = db.updateStatus(id, 'offline', nextSummary, { touchLastSeen: false });
          return { ...updated, connectAttempted: true, connectSuccess: false, error: result.error || 'SSH connection failed' };
        }

        console.log(`[SSH] Datos obtenidos. Actualizando BD...`);

        state.failCount = 0;
        state.lastSuccessAt = Date.now();

        // Update firewall with status and summary
        const summaryWithOk = { ...result.summary, lastError: null, lastErrorAt: null };
        const updated = db.updateStatus(id, 'online', summaryWithOk);
        return { ...updated, connectAttempted: true, connectSuccess: true };
      } catch (err) {
        console.error(`[SSH] Exception (inFlight):`, err);
        state.failCount = Math.min(20, (state.failCount || 0) + 1);
        state.lastFailAt = Date.now();

        try {
          const currentFw = db.getFirewall(id);
          if (currentFw) {
            const prevSummary = currentFw.summary || null;
            const nextSummary = prevSummary
              ? { ...prevSummary, lastError: err.message, lastErrorAt: Date.now() }
              : { lastError: err.message, lastErrorAt: Date.now() };
            const updated = db.updateStatus(id, 'offline', nextSummary, { touchLastSeen: false });
            return { ...updated, connectAttempted: true, connectSuccess: false, error: err.message };
          }
        } catch (e) {}
        return { error: err.message, connectAttempted: true, connectSuccess: false };
      } finally {
        state.inFlight = null;
      }
    })();

    const payload = await state.inFlight;
    res.json(payload);
  } catch (err) {
    console.error(`[SSH] Exception:`, err);
    try {
      const fw = db.getFirewall(req.params.id);
      if (fw) {
        const prevSummary = fw.summary || null;
        const nextSummary = prevSummary
          ? { ...prevSummary, lastError: err.message, lastErrorAt: Date.now() }
          : { lastError: err.message, lastErrorAt: Date.now() };
        const updated = db.updateStatus(req.params.id, 'offline', nextSummary, { touchLastSeen: false });
        return res.json({ ...updated, connectAttempted: true, connectSuccess: false, error: err.message });
      }
    } catch (e) {}
    res.status(500).json({ error: err.message });
  }
});

// GET diagnostic info (for debugging SSH issues)
app.get('/firewalls/:id/diagnostic', auth.authMiddleware, async (req, res) => {
  try {
    const fw = db._getFirewallWithCredentials(req.params.id);
    if (!fw) return res.status(404).json({ error: 'Firewall not found' });

    console.log(`[DIAG] Conectando a ${fw.name} para diagnostic...`);
    
    const result = await sshUtils.fetchPfSenseStats(
      fw.ip,
      fw.port || 22,
      fw.user,
      fw.password,
      fw.key
    );

    // Retornar raw output para inspection
    const rawOutput = result.output || '';
    res.json({
      success: result.success,
      error: result.error,
      rawOutput: rawOutput,
      summary: result.summary,
      bytesReceived: rawOutput.length || 0,
      linesReceived: (rawOutput.split('\n') || []).length || 0
    });
  } catch (err) {
    console.error(`[DIAG] Exception:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Seed inicial: crear usuario admin si no existe
async function seedAdminUser() {
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@localhost';

    const existing = db.getUserByUsername(adminUsername);
    if (existing) {
      console.log('[Auth] Usuario admin ya existe');
      return;
    }

    const passwordHash = await auth.hashPassword(adminPassword);
    const adminId = 'admin-' + Date.now();
    db.createUser(adminId, adminUsername, passwordHash, adminEmail, 'admin');
    
    console.log('====================================');
    console.log('[Auth] ⚠️  Usuario admin creado:');
    console.log(`       Username: ${adminUsername}`);
    console.log(`       Password: ${adminPassword}`);
    console.log('       Por favor cambia la contraseña después del primer login');
    console.log('====================================');
  } catch (err) {
    console.error('[Auth] Error creando usuario admin:', err);
  }
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  console.log(`Backend SSH WebSocket API running on port ${PORT}`);
  await seedAdminUser();
});

