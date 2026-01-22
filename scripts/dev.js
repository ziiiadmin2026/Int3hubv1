const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');

const BACKEND_PORT = Number(process.env.PORT || 4000);
const NEXT_PORT = Number(process.env.NEXT_PORT || 3000);

const isWindows = process.platform === 'win32';

function httpGetJson(url, timeoutMs = 800) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (e) {
          reject(new Error('Invalid JSON'));
        }
      });
    });
    req.on('timeout', () => {
      try { req.destroy(); } catch (_) {}
      reject(new Error('timeout'));
    });
    req.on('error', reject);
  });
}

async function isBackendHealthy(port) {
  try {
    const r = await httpGetJson(`http://127.0.0.1:${port}/api/health`, 600);
    return r.status === 200 && r.json && r.json.ok === true;
  } catch {
    return false;
  }
}

function tryListenOnce(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, host, () => {
      srv.close(() => resolve(true));
    });
  });
}

async function findFreePort(startPort) {
  let p = startPort;
  for (let i = 0; i < 50; i++) {
    // Probamos bind IPv4 localhost; suficiente para dev.
    // Si está libre, lo usamos.
    // Si no, incrementamos.
    // eslint-disable-next-line no-await-in-loop
    const ok = await tryListenOnce(p);
    if (ok) return p;
    p += 1;
  }
  throw new Error('No free port found');
}

function runPowerShell(command) {
  return new Promise((resolve) => {
    const ps = spawn('powershell.exe', ['-NoProfile', '-Command', command], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let out = '';
    ps.stdout.on('data', (d) => { out += d.toString(); });
    ps.on('close', () => resolve(out.trim()));
    ps.on('error', () => resolve(''));
  });
}

async function findPidOnPortWindows(port) {
  const out = await runPowerShell(`(Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)`);
  const pid = Number(String(out).trim());
  return Number.isFinite(pid) && pid > 0 ? pid : null;
}

async function tryKillPortOwner(port) {
  if (!isWindows) return false;
  const pid = await findPidOnPortWindows(port);
  if (!pid) return false;
  try {
    // Prefer PowerShell Stop-Process on Windows
    await runPowerShell(`Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`);
    // Fallback taskkill (some cases Stop-Process doesn't catch children)
    await runPowerShell(`taskkill /PID ${pid} /F 2>$null | Out-Null`);
    return true;
  } catch {
    return false;
  }
}

async function killPid(pid) {
  if (!pid) return;
  if (isWindows) {
    await runPowerShell(`Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`);
    await runPowerShell(`taskkill /PID ${pid} /F 2>$null | Out-Null`);
    return;
  }
  try { process.kill(pid, 'SIGTERM'); } catch (_) {}
}

function canConnect(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (result) => {
      try { socket.destroy(); } catch (_) {}
      resolve(result);
    };
    socket.setTimeout(500);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

async function isPortListening(port) {
  // Importante: en Windows un proceso puede escuchar en :: (IPv6) y ocupar también IPv4.
  // Por eso probamos conexión a 127.0.0.1 y ::1.
  const v4 = await canConnect(port, '127.0.0.1');
  if (v4) return true;
  const v6 = await canConnect(port, '::1');
  return v6;
}

function spawnNode(cwd, args) {
  return spawn(process.execPath, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    windowsHide: false,
  });
}

function spawnNodeWithEnv(cwd, args, extraEnv) {
  return spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
    windowsHide: false,
  });
}

async function main() {
  const children = [];

  let backendPort = BACKEND_PORT;

  const backendListening = await isPortListening(backendPort);
  if (backendListening) {
    const healthy = await isBackendHealthy(backendPort);
    if (healthy) {
      console.log(`[dev] Backend saludable detectado en :${backendPort} (reuse)`);
    } else {
      console.log(`[dev] Puerto :${backendPort} está ocupado pero NO parece ser el backend (o está colgado).`);
      const killed = await tryKillPortOwner(backendPort);
      if (killed) {
        // pequeña espera para liberar socket
        await new Promise((r) => setTimeout(r, 600));
      }
      // Si sigue ocupado, buscamos otro puerto
      if (await isPortListening(backendPort)) {
        const alt = await findFreePort(backendPort + 1);
        console.log(`[dev] Usando puerto alterno para backend: :${alt}`);
        backendPort = alt;
        const backendChild = spawnNodeWithEnv(backendDir, ['ws-server.js'], { PORT: String(backendPort) });
        children.push(backendChild);
      } else {
        console.log(`[dev] Puerto :${backendPort} liberado. Iniciando backend...`);
        const backendChild = spawnNodeWithEnv(backendDir, ['ws-server.js'], { PORT: String(backendPort) });
        children.push(backendChild);
      }
    }
  } else {
    console.log(`[dev] Iniciando backend en :${backendPort}...`);
    const backendChild = spawnNodeWithEnv(backendDir, ['ws-server.js'], { PORT: String(backendPort) });
    children.push(backendChild);
  }

  // Next port
  let nextPort = NEXT_PORT;
  if (await isPortListening(nextPort)) {
    const altNext = await findFreePort(nextPort + 1);
    console.log(`[dev] Puerto :${nextPort} ocupado. Usando Next en :${altNext}`);
    nextPort = altNext;
  }
  const nextBin = require.resolve('next/dist/bin/next');
  console.log(`[dev] Iniciando Next.js en :${nextPort}...`);
  const nextChild = spawnNodeWithEnv(
    rootDir,
    [nextBin, 'dev', '-p', String(nextPort)],
    { NEXT_PUBLIC_API_BASE: `http://127.0.0.1:${backendPort}` }
  );
  children.push(nextChild);

  const shutdown = () => {
    for (const child of children) {
      if (!child) continue;
      try { child.kill(); } catch (_) {}
      // Ensure we don't leave orphan node processes holding ports on Windows
      if (child.pid) {
        killPid(child.pid).catch(() => {});
      }
    }
  };

  process.on('SIGINT', () => {
    shutdown();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    shutdown();
    process.exit(0);
  });

  for (const child of children) {
    child.on('exit', (code, signal) => {
      if (signal) {
        console.log(`[dev] Proceso terminó por señal ${signal}`);
      }
      if (typeof code === 'number' && code !== 0) {
        console.log(`[dev] Proceso terminó con código ${code}`);
      }
      shutdown();
      // Salimos con el código del proceso que murió.
      process.exit(typeof code === 'number' ? code : 1);
    });
  }
}

main().catch((err) => {
  console.error('[dev] Error:', err);
  process.exit(1);
});
