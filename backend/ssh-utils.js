const { Client } = require('ssh2');

const MAX_RAW_SUMMARY_CHARS = 20000;

function humanBytes(bytes) {
  if (!bytes && bytes !== 0) return null;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = Number(bytes);
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}

function parsePfSenseOutput(buf) {
  const cleaned = String(buf)
    // Quitar ANSI (colores) y algunos control chars comunes
    .replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, '')
    .replace(/[\u0008]/g, '');

  const lines = cleaned.split(/\r?\n/);
  const summary = {
    uptime: null,
    loadAverages: null,
    ips: [],
    interfaces: [],
    gateway: null,
    gateways: [],
    wanIface: null,
    primaryIp: null,
    ifaceNames: {},
    uname: null,
    cpuCount: null,
    memory: null,
    disk: null,
    raw: cleaned.length > MAX_RAW_SUMMARY_CHARS
      ? `${cleaned.slice(0, MAX_RAW_SUMMARY_CHARS)}\n...TRUNCATED...`
      : cleaned
  };

  console.log(`[PARSE] Procesando ${lines.length} líneas...`);

  // Uptime / load
  const upLine = lines.find(l => /load average|up\s+\d+/i.test(l) || /^\s+\d{2}:\d{2}/.test(l));
  if (upLine) {
    summary.uptime = upLine.trim();
    console.log(`[PARSE] Uptime encontrado: ${summary.uptime.substring(0, 50)}`);

    // FreeBSD: "load averages: 0.12, 0.09, 0.08"
    const lm = upLine.match(/load averages?:\s*([0-9.]+)[,\s]+([0-9.]+)[,\s]+([0-9.]+)/i);
    if (lm) {
      summary.loadAverages = {
        m1: Number(lm[1]),
        m5: Number(lm[2]),
        m15: Number(lm[3]),
      };
      console.log(`[PARSE] Load avg: ${summary.loadAverages.m1}, ${summary.loadAverages.m5}, ${summary.loadAverages.m15}`);
    }
  }

  // uname / OS line
  const unameLine = lines.find(l => /FreeBSD|pfSense|Darwin|Linux|BSD/.test(l));
  if (unameLine) {
    summary.uname = unameLine.trim();
    console.log(`[PARSE] Uname encontrado: ${summary.uname.substring(0, 50)}`);
  }

  // Parse sysctl output
  lines.forEach(l => {
    // CPU
    if (/hw\.ncpu/.test(l)) {
      const match = l.match(/:\s*(\d+)/);
      if (match) {
        summary.cpuCount = Number(match[1]);
        console.log(`[PARSE] CPU Cores: ${summary.cpuCount}`);
      }
    }
    // Memory
    if (/hw\.physmem/.test(l)) {
      const match = l.match(/:\s*(\d+)/);
      if (match) {
        summary.memory = humanBytes(Number(match[1]));
        console.log(`[PARSE] Memory: ${summary.memory}`);
      }
    }
    // Disk
    if (/^\/dev\//.test(l) && /\d+%/.test(l)) {
      const match = l.match(/^\/dev\/\S+\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d+)%\s+\//);
      if (match) {
        summary.disk = { size: match[1], used: match[2], avail: match[3], percent: match[4] + '%' };
        console.log(`[PARSE] Disk: ${summary.disk.percent}`);
      }
    }
  });

  // Interface parsing: look for lines like 're0: flags=' then 'inet' lines
  let currentIface = null;
  for (const l of lines) {
    const ifaceMatch = l.match(/^([a-zA-Z0-9_]+):\s+flags=/);
    if (ifaceMatch) {
      currentIface = ifaceMatch[1];
      console.log(`[PARSE] Interface encontrada: ${currentIface}`);
      continue;
    }
    if (currentIface) {
      const descMatch = l.match(/^\s*description:\s*(.+)\s*$/i);
      if (descMatch) {
        const desc = descMatch[1].trim();
        if (desc) summary.ifaceNames[currentIface] = desc;
      }
      const inetMatch = l.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
      if (inetMatch) {
        summary.interfaces.push({ iface: currentIface, ip: inetMatch[1] });
        summary.ips.push(inetMatch[1]);
        console.log(`[PARSE] IP en ${currentIface}: ${inetMatch[1]}`);
      }
    }
  }

  // Capturar gateways desde dpinger (daemon de monitoreo de pfSense)
  // Formato del ls: dpinger_MetroWANGW~189.193.237.106~189.193.237.105.sock
  // El formato es: dpinger_NOMBRE~IP_LOCAL~IP_GATEWAY.sock
  const dpingerGateways = {}; // { gateway_ip: { name, status, loss, delay } }
  const configuredGateways = new Set(); // IPs de gateways configurados
  let inDpingerSection = false;
  
  for (const l of lines) {
    if (l.includes('===DPINGER===')) {
      inDpingerSection = true;
      continue;
    }
    if (l.includes('===GATEWAYS===')) {
      inDpingerSection = false;
      continue;
    }
    if (!inDpingerSection) continue;
    
    // Parsear resultado de ping: PING_OK:gwname:gwip o PING_FAIL:gwname:gwip
    if (l.startsWith('PING_OK:') || l.startsWith('PING_FAIL:')) {
      const parts = l.split(':');
      if (parts.length >= 3) {
        const isPingOk = parts[0] === 'PING_OK';
        const gwName = parts[1];
        const gwIP = parts[2];
        
        const status = isPingOk ? 'online' : 'down';
        const loss = isPingOk ? 0 : 100;
        
        dpingerGateways[gwIP] = { name: gwName, status: status, loss: loss, delay: 0 };
        console.log(`[PARSE] Gateway status (ping): ${gwName} (${gwIP}) -> ${status} (loss: ${loss}%)`);
      }
      continue;
    }
    
    // Parsear formato dpinger socket: dpinger_NOMBRE~IP_LOCAL~IP_GATEWAY.sock
    const dpingerMatch = l.match(/dpinger_(.+?)~(.+?)~(.+?)\.sock/);
    if (dpingerMatch) {
      const [, gwName, localIP, gwIP] = dpingerMatch;
      configuredGateways.add(gwIP);
      
      // Si no hay datos de ping yet, marcar como desconocido (será ping más adelante)
      if (!dpingerGateways[gwIP]) {
        dpingerGateways[gwIP] = { name: gwName, status: 'unknown', loss: 0, delay: 0 };
        console.log(`[PARSE] Gateway detectado (esperando ping): ${gwName} -> ${gwIP}`);
      }
    }
    
    // Parsear archivo gateways.status si existe
    // Formato: GWNAME~192.168.1.1~online~10ms~2ms~0.5%
    if (l.includes('~') && !l.includes('dpinger_') && !l.includes('.sock') && !l.includes('===')) {
      const parts = l.trim().split('~');
      if (parts.length >= 4) {
        const gwName = parts[0];
        const gwIP = parts[1];
        const statusStr = parts[2] || 'online';
        const delayStr = parts[3] || '0';
        const lossStr = parts[5] || '0';
        
        const delay = parseFloat(delayStr.replace(/[^0-9.]/g, '')) || 0;
        const loss = parseFloat(lossStr.replace(/[^0-9.]/g, '')) || 0;
        
        let status = 'online';
        if (statusStr.toLowerCase().includes('down') || statusStr.toLowerCase().includes('offline') || loss >= 100) {
          status = 'down';
        } else if (loss > 5 || delay > 500) {
          status = 'degraded';
        }
        
        configuredGateways.add(gwIP);
        dpingerGateways[gwIP] = { name: gwName, status: status, loss: loss, delay: delay };
        console.log(`[PARSE] Estado gateway (gateways.status): ${gwName} (${gwIP}) -> ${status} (loss: ${loss}%, delay: ${delay}ms)`);
      }
    }
  }

  // Capturar nombres de gateways desde config.xml de pfSense
  // Formato: <name>METROCARRIER200MBGW</name> <gateway>189.192.233.117</gateway> <monitor>189.192.233.117</monitor>
  const gatewayNames = {}; // { gateway_ip: name }
  let inGatewaySection = false;
  let currentGwName = null;
  let currentGwIP = null;
  
  for (const l of lines) {
    if (l.includes('===GATEWAYS===')) {
      inGatewaySection = true;
      continue;
    }
    if (!inGatewaySection) continue;
    
    const nameMatch = l.match(/<name>([^<]+)<\/name>/);
    if (nameMatch) {
      currentGwName = nameMatch[1];
    }
    
    const gwMatch = l.match(/<gateway>([^<]+)<\/gateway>/);
    if (gwMatch && currentGwName) {
      currentGwIP = gwMatch[1];
      gatewayNames[currentGwIP] = currentGwName;
      configuredGateways.add(currentGwIP);
      
      // Si el gateway está configurado pero NO tiene archivo .sock, está DOWN
      if (!dpingerGateways[currentGwIP]) {
        dpingerGateways[currentGwIP] = { name: currentGwName, status: 'down', loss: 100, delay: 0 };
        console.log(`[PARSE] Gateway configurado pero DOWN (sin .sock): ${currentGwName} -> ${currentGwIP}`);
      } else {
        console.log(`[PARSE] Gateway configurado: ${currentGwName} -> ${currentGwIP}`);
      }
      
      currentGwName = null;
      currentGwIP = null;
    }
  }

  // Capturar configuración de WANs desde el menú pfSense
  // Buscar líneas como: "E2TOTALPLAY300 (wan)", "METROCARRIER200MB (opt3)", etc.
  // FILTRAR solo las que son realmente WANs de internet (no LAN/WLAN/AP)
  const wanConfigs = [];
  for (const l of lines) {
    const wanMatch = l.match(/(\S+)\s+\((wan|opt\d+)\)\s+->\s+(\S+)\s+->\s+(v4.*?)?([\d.]+\/\d+)/);
    if (wanMatch) {
      const name = wanMatch[1];
      // EXCLUIR interfaces internas: LANs, WLANs, Guest, Office, Admin, VPN, VLANs específicas
      // Criterio: Si tiene IPs privadas RFC1918 (10.x, 192.168.x, 172.16-31.x) y nombre indica interno
      const ipPart = wanMatch[5] || wanMatch[4];
      const ip = ipPart.split('/')[0];
      
      // Si la IP es privada (10.x, 192.x, 172.16-31.x) considerar como LAN excepto si es gateway/VPN
      const isPrivate = /^(10\.|192\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(ip);
      
      // Excluir por nombre: WLAN, GUEST, ADM, OFFICE, VISITA, etc.
      const hasLANName = /(WLAN|GUEST|ADM|OFFICE|VISITA|INVITADO|CHROME|SONOS|REDUNDANCIA)/i.test(name);
      
      // Excluir si tiene IP privada Y nombre de LAN
      const isLAN = isPrivate || hasLANName;
      
      if (!isLAN) {
        wanConfigs.push({
          name: wanMatch[1],
          iface: wanMatch[3],
          ip: ip
        });
        console.log(`[PARSE] WAN detectada: ${wanMatch[1]} en ${wanMatch[3]} (${ipPart})`);
      } else {
        console.log(`[PARSE] Interface LAN/privada ignorada: ${name} (${ip})`);
      }
    }
  }

  // ESTRATEGIA: Detectar TODOS los gateways configurados (default + adicionales)
  // Primero: buscar gateway default (principal)
  const defaultLines = lines.filter(l => /^default\s+/i.test(l) || /^0\.0\.0\.0\s+/.test(l));
  
  if (defaultLines.length > 0) {
    const line = defaultLines[0];
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      summary.gateway = parts[1];
      console.log(`[PARSE] Gateway principal (default): ${summary.gateway}`);
      if (parts.length >= 4) {
        summary.wanIface = parts[3];
        console.log(`[PARSE] WAN iface activa: ${summary.wanIface}`);
      }
    }
  }

  // Segundo: buscar TODOS los gateways configurados en netstat (líneas con gateway)
  // Formato típico: "Destination  Gateway  Flags  Netif"
  const allGateways = [];
  for (const l of lines) {
    // Buscar líneas que tengan gateway (no 'link#' y que tengan IP como gateway)
    if (!/link#/i.test(l) && /\s+(\d+\.\d+\.\d+\.\d+)\s+\w+\s+(\w+)/.test(l)) {
      const match = l.match(/(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+\w+\s+(\w+)/);
      if (match && match[2] !== '0.0.0.0' && match[2] !== '127.0.0.1') {
        const gatewayIP = match[2];
        const iface = match[3];
        // Evitar duplicados
        if (!allGateways.find(g => g.ip === gatewayIP)) {
          allGateways.push({ ip: gatewayIP, iface: iface });
          console.log(`[PARSE] Gateway adicional encontrado: ${gatewayIP} via ${iface}`);
        }
      }
    }
  }

  // Tercero: Combinar WANs del menú con gateways detectados
  const gatewayConfigs = [];
  
  // A) Agregar WANs del menú que tengan IP pública
  wanConfigs.forEach(wan => {
    gatewayConfigs.push({
      name: wan.name,
      ip: wan.ip,
      iface: wan.iface,
      source: 'menu'
    });
  });

  // B) Agregar gateways que NO estén en la lista del menú (como ENCOREENLACEGW)
  //    Evitar agregar gateways de la misma subnet que ya existen en el menú
  allGateways.forEach(gw => {
    // Si la interface ya tiene un gateway del menú, no agregarlo (evita duplicados)
    const existsInMenu = gatewayConfigs.find(c => c.iface === gw.iface);
    
    if (!existsInMenu) {
      // 1. Primero buscar nombre en el XML de configuración
      let name = gatewayNames[gw.ip];
      
      // 2. Si no está en XML, buscar IP de la interfaz para construir nombre
      if (!name) {
        const ifaceIP = summary.interfaces.find(i => i.iface === gw.iface);
        if (ifaceIP?.ip) {
          name = `WAN_${gw.iface.toUpperCase()}`;
        } else {
          name = `GW_${gw.iface}`;
        }
      }
      
      gatewayConfigs.push({
        name: name,
        ip: gw.ip,
        iface: gw.iface,
        source: 'netstat'
      });
      console.log(`[PARSE] Gateway de netstat agregado: ${name} (${gw.ip})`);
    }
  });

  // Crear entries de gateway para el dashboard (solo WANs únicas)
  if (gatewayConfigs.length > 0) {
    gatewayConfigs.forEach((gw, idx) => {
      const isActive = gw.iface === summary.wanIface || gw.ip === summary.gateway;
      
      // Buscar nombre y estado real desde dpinger (más confiable que config.xml)
      let finalName = gw.name;
      let finalStatus = 'online';
      let finalLoss = null;
      let finalDelay = null;
      
      if (dpingerGateways[gw.ip]) {
        finalName = dpingerGateways[gw.ip].name;
        finalStatus = dpingerGateways[gw.ip].status;
        finalLoss = dpingerGateways[gw.ip].loss;
        finalDelay = dpingerGateways[gw.ip].delay;
        console.log(`[PARSE] Usando datos de dpinger: ${finalName} (${gw.ip}) -> ${finalStatus} (loss: ${finalLoss}%, delay: ${finalDelay}ms)`);
      }
      
      summary.gateways.push({
        name: finalName,
        monitor: gw.ip,
        status: finalStatus,
        delay: finalDelay,
        loss: finalLoss,
        isActive: isActive
      });
      console.log(`[PARSE] Gateway ${idx + 1}: ${finalName} (${gw.ip}) via ${gw.iface} - ${isActive ? 'ACTIVE' : 'backup'} - Estado: ${finalStatus} [${gw.source}]`);
    });
  } else if (summary.gateway) {
    // Fallback: solo hay info del gateway default
    summary.gateways.push({
      name: summary.wanIface ? `GW_${summary.wanIface}` : 'WAN',
      monitor: summary.gateway,
      status: 'online',
      delay: null,
      loss: null,
      isActive: true
    });
  }

  const isPrivateIPv4 = (ip) => {
    const m = String(ip).match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (!m) return false;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  };

  // primaryIp: preferimos la IP de la interfaz del default route (WAN)
  if (summary.wanIface) {
    const wan = summary.interfaces.find((it) => it.iface === summary.wanIface && it.ip);
    if (wan?.ip) summary.primaryIp = wan.ip;
  }
  // fallback: primera IP pública
  if (!summary.primaryIp && summary.ips.length) {
    summary.primaryIp = summary.ips.find((ip) => !isPrivateIPv4(ip)) || summary.ips[0];
  }

  // Reordenar lista para que primaryIp (si existe) vaya primero
  if (summary.primaryIp) {
    summary.ips = [summary.primaryIp, ...summary.ips.filter((ip) => ip !== summary.primaryIp)];
  }

  // Fallback: buscar cualquier IPv4
  if (!summary.ips.length) {
    const fallback = cleaned.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
    if (fallback) {
      summary.ips.push(fallback[1]);
      console.log(`[PARSE] IP fallback: ${fallback[1]}`);
    }
  }

  console.log(`[PARSE] Resultado final:`, {
    uptime: !!summary.uptime,
    ips: summary.ips.length,
    interfaces: summary.interfaces.length,
    cpuCount: summary.cpuCount,
    memory: summary.memory,
    disk: !!summary.disk,
    gateway: summary.gateway,
    gateways: summary.gateways.length
  });

  return summary;
}

/**
 * Ejecutar comando SSH y obtener output
 * @param {string} host
 * @param {number} port
 * @param {string} user
 * @param {string} password
 * @param {string} key
 * @param {string} command
 * @param {{ endMarker?: string }=} options
 * @returns {Promise<{success: boolean, output: string, error?: string}>}
 */
function executeSSH(host, port = 22, user, password, key, command, options = undefined) {
  return new Promise((resolve) => {
    const conn = new Client();
    let output = '';
    let connected = false;
    let sent8 = false;
    let commandsScheduled = false;
    let sentCommands = false;
    let commandCloseTimer = null;
    let menuFallbackTimer = null;
    const endMarker = options?.endMarker || '__END__';
    let markerSeen = false;
    let finished = false;

    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hasMarkerLine = (text) => {
      // Importante: el comando se imprime (eco) e incluye el marcador como substring.
      // Solo consideramos "fin" cuando el marcador aparece como línea completa.
      const re = new RegExp(`(^|\\r?\\n)${escapeRegExp(endMarker)}(\\r?\\n|$)`);
      return re.test(text);
    };

    const finish = (success, error) => {
      if (finished) return;
      finished = true;
      try { if (commandCloseTimer) clearTimeout(commandCloseTimer); } catch (e) {}
      try { if (menuFallbackTimer) clearTimeout(menuFallbackTimer); } catch (e) {}
      resolve({ success, output, error });
      try { conn.end(); } catch (e) {}
    };
    
    console.log(`[SSH] Iniciando conexión a ${host}:${port} con ${password ? 'contraseña' : 'clave privada'}...`);
    const debugEnabled = process.env.SSH_DEBUG === '1';
    
    const timeout = setTimeout(() => {
      console.log(`[SSH] Timeout alcanzado (45s)`);
      try { conn.end(); } catch(e) {}
      finish(false, 'SSH timeout');
    }, 45000);

    conn.on('ready', () => {
      connected = true;
      console.log(`[SSH] Conexión lista, abriendo shell (pfSense menú -> opción 8)`);

      conn.shell({ term: 'vt100' }, (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          console.log(`[SSH] Error abriendo shell:`, err.message);
          conn.end();
          return resolve({ success: false, output, error: err.message });
        }

        const scheduleCommands = () => {
          if (commandsScheduled) return;
          commandsScheduled = true;
          setTimeout(() => {
            if (sentCommands) return;
            sentCommands = true;
            console.log('[SSH] Enviando comandos...');
            try { stream.write(`sh\r\n${command}\r\nexit\r\n`); } catch (e) {}
            commandCloseTimer = setTimeout(() => {
              console.log('[SSH] Forzando cierre tras comando (15s)');
              try { stream.end(); } catch (e) {}
              finish(true);
            }, 15000);
          }, 700);
        };

        // Fallback: si por cualquier motivo no detectamos el prompt del menú,
        // intentamos entrar a Shell y ejecutar comandos después de un momento.
        menuFallbackTimer = setTimeout(() => {
          if (!sent8) {
            console.log('[SSH] Fallback: enviando opción 8 (sin ver prompt)');
            sent8 = true;
            try { stream.write('8\r\n'); } catch (e) {}
          }
          scheduleCommands();
        }, 1800);

        stream.on('data', (data) => {
          if (finished || markerSeen) return;
          const chunk = data.toString();
          output += chunk;

          // 1) Cerrar apenas llegue el marcador (puede venir partido entre chunks)
          if (hasMarkerLine(output)) {
            markerSeen = true;
            console.log('[SSH] Marcador de fin detectado, cerrando stream');
            clearTimeout(timeout);
            if (commandCloseTimer) { clearTimeout(commandCloseTimer); commandCloseTimer = null; }
            if (menuFallbackTimer) { clearTimeout(menuFallbackTimer); menuFallbackTimer = null; }
            // No enviamos 'exit' aquí: eso puede rebotar al menú y llenar el output.
            // El marcador ya indica que tenemos todo lo que necesitamos.
            setTimeout(() => {
              try { stream.end(); } catch (e) {}
            }, 50);
            finish(true);
            return;
          }

          // 2) Si aparece menú, elegir opción 8 (Shell)
          if (!sent8 && /Enter an option:/i.test(output)) {
            sent8 = true;
            console.log('[SSH] Detectado menú pfSense, enviando opción 8...');
            try { stream.write('8\r\n'); } catch (e) {}
            scheduleCommands();
          }
        });

        stream.stderr.on('data', (data) => {
          output += data.toString();
        });

        stream.on('close', (code) => {
          clearTimeout(timeout);
          if (commandCloseTimer) { clearTimeout(commandCloseTimer); }
          if (menuFallbackTimer) { clearTimeout(menuFallbackTimer); }
          console.log(`[SSH] Shell cerrada con código ${code}, bytes: ${output.length}`);
          finish(true);
        });
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      console.log(`[SSH] Error de conexión:`, err.message);
      if (!connected) {
        finish(false, err.message);
      }
    }).connect({
      host,
      port: Number(port) || 22,
      username: user,
      password: password || undefined,
      privateKey: key || undefined,
      readyTimeout: 20000,
      connectTimeout: 20000,
      debug: debugEnabled ? (info) => console.log(`[SSH-DEBUG] ${info}`) : undefined,
      algorithms: {
        serverHostKey: ['ssh-rsa', 'rsa-sha2-512', 'rsa-sha2-256', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'ssh-dss', 'ssh-ed25519'],
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-cbc', 'aes192-cbc', 'aes256-cbc', '3des-cbc', 'aes256-gcm@openssh.com', 'aes128-gcm@openssh.com'],
        hmac: ['hmac-sha1', 'hmac-sha2-256', 'hmac-sha2-512', 'hmac-md5'],
      },
      compat: 'old',
    });
  });
}

/**
 * Obtener información del sistema pfSense
 * @param {string} host
 * @param {number} port
 * @param {string} user
 * @param {string} password
 * @param {string} key
 * @returns {Promise<{success: boolean, summary?: object, error?: string}>}
 */
async function fetchPfSenseStats(host, port, user, password, key) {
  try {
    // Secuencia lineal con ; y marcador de fin (único por ejecución para no cortar por el eco del comando)
    const token = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
    const endMarker = `__END__${token}__`;
    const commands = `uname -a; uptime; sysctl hw.ncpu; sysctl hw.physmem; ifconfig -a; netstat -rn; df -h /; echo "===GATEWAYS==="; (grep -A 10 '<gateway>' /cf/conf/config.xml 2>/dev/null || grep -A 10 '<gateway>' /conf/config.xml 2>/dev/null) | grep -E '<name>|<gateway>|<monitor>' | head -30; echo "===DPINGER==="; ls -la /var/run/dpinger_*.sock 2>/dev/null; for sock in /var/run/dpinger_*.sock; do if [ -S "$sock" ]; then gwip=\`echo "$sock" | sed 's/.*~\\([0-9.]*\\)\\.sock/\\1/'\`; gwname=\`echo "$sock" | sed 's/.*dpinger_\\(.*\\)~.*/\\1/'\`; ping -c 2 -W 1 "$gwip" >/dev/null 2>&1; if [ $? -eq 0 ]; then echo "PING_OK:$gwname:$gwip"; else echo "PING_FAIL:$gwname:$gwip"; fi; fi; done; printf '%s\n' '${endMarker}'`;

    console.log(`[FETCH] Ejecutando comandos en ${host}:${port}...`);
    const result = await executeSSH(host, port, user, password, key, commands, { endMarker });

    if (!result.success) {
      console.log(`[FETCH] Error: ${result.error}`);
      return { success: false, error: result.error };
    }

    console.log(`[FETCH] Output recibido (${result.output.length} chars)`);
    console.log(`[FETCH] Raw output: ${result.output.substring(0, 500)}`);
    const summary = parsePfSenseOutput(result.output);
    console.log(`[FETCH] Summary parsed:`, JSON.stringify(summary).substring(0, 300));
    return { success: true, summary };
  } catch (err) {
    console.error(`[FETCH] Exception:`, err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  executeSSH,
  fetchPfSenseStats,
  parsePfSenseOutput,
  humanBytes
};
