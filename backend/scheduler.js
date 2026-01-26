/**
 * Scheduler para monitoreo continuo de firewalls
 * Ejecuta verificaciones periódicas y envía notificaciones
 */

const { getFirewalls, updateFirewallStatus, getSettings } = require('./db');
const { Client } = require('ssh2');
const nodemailer = require('nodemailer');

let currentSettings = null;
let transporter = null;
let monitorInterval = null;

/**
 * Recargar configuración desde la BD
 */
function reloadSettings() {
  try {
    currentSettings = getSettings();
    
    // Reinicializar transporter si cambió la config
    if (currentSettings.notifications_enabled && currentSettings.smtp_user) {
      transporter = nodemailer.createTransport({
        host: currentSettings.smtp_host,
        port: currentSettings.smtp_port,
        secure: false, // Use TLS via STARTTLS
        requireTLS: true, // Require TLS
        auth: {
          user: currentSettings.smtp_user,
          pass: currentSettings.smtp_pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      console.log('[Scheduler] Email notifications enabled');
    } else {
      transporter = null;
      console.log('[Scheduler] Email notifications disabled');
    }
    
    return currentSettings;
  } catch (error) {
    console.error('[Scheduler] Error loading settings:', error.message);
    return null;
  }
}

/**
 * Enviar notificación por email
 */
async function sendEmailNotification(subject, message, firewall) {
  const settings = currentSettings || reloadSettings();
  
  // Usar emails específicos del firewall o los globales
  const recipientEmails = firewall.alert_emails && firewall.alert_emails.length > 0 
    ? firewall.alert_emails 
    : settings.alert_emails;
  
  if (!transporter || !settings.notifications_enabled || !recipientEmails || recipientEmails.length === 0) {
    return;
  }

  try {
    // Determinar tipo de alerta
    const isDown = subject.includes('DOWN') || subject.includes('caído') || subject.includes('offline');
    const isUp = subject.includes('RECOVERED') || subject.includes('recuperado') || subject.includes('online');
    const isDisk = subject.includes('disk') || subject.includes('disco');
    
    let statusColor, statusBg, statusIcon, statusText;
    if (isDown) {
      statusColor = '#ef4444';
      statusBg = '#7f1d1d';
      statusIcon = '🔴';
      statusText = 'ENLACE CAÍDO';
    } else if (isUp) {
      statusColor = '#10b981';
      statusBg = '#064e3b';
      statusIcon = '🟢';
      statusText = 'ENLACE RESTABLECIDO';
    } else if (isDisk) {
      statusColor = '#f59e0b';
      statusBg = '#78350f';
      statusIcon = '⚠️';
      statusText = 'ALERTA DE DISCO';
    } else {
      statusColor = '#3b82f6';
      statusBg = '#1e3a8a';
      statusIcon = 'ℹ️';
      statusText = 'NOTIFICACIÓN';
    }
    
    const normalizeFromAddress = (settings) => {
      const rawCandidates = [settings.smtp_from, settings.smtp_user].filter(v => typeof v === 'string');
      const raw = (rawCandidates.find(v => v.trim().length > 0) || '').trim();
      if (/[\r\n]/.test(raw)) return null;
      if (raw.includes('<') && raw.includes('>') && raw.includes('@')) return raw;
      const looksLikeEmail = /^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(raw);
      if (!looksLikeEmail) return null;
      return { name: 'Int3 Hub OnLine', address: raw };
    };

    const fromValue = normalizeFromAddress(settings);
    if (!fromValue) {
      throw new Error('Remitente inválido. Configura smtp_user o smtp_from con un email válido.');
    }

    await transporter.sendMail({
      from: fromValue,
      to: recipientEmails.join(', '),
      subject: `${statusIcon} [IntHub] ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #1a1a2e;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #16213e; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                      <img src="https://integrational3.com.mx/logorigen/i3logo25x25.png" alt="Int3" style="width: 40px; height: 40px; vertical-align: middle;">
                      <h1 style="color: white; margin: 10px 0 5px 0; font-size: 28px;">Int3 Hub OnLine</h1>
                      <p style="color: #e0e7ff; margin: 0; font-size: 14px;">Alerta de Monitoreo Multi-Firewall</p>
                    </td>
                  </tr>
                  
                  <!-- Status Badge -->
                  <tr>
                    <td style="padding: 30px; text-align: center;">
                      <div style="display: inline-block; background-color: ${statusColor}; color: white; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        ${statusIcon} ${statusText}
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Firewall Info -->
                  <tr>
                    <td style="padding: 0 30px 20px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, ${statusBg} 0%, #1f2937 100%); border-radius: 6px; padding: 25px; border-left: 4px solid ${statusColor};">
                        <tr>
                          <td>
                            <h2 style="color: white; margin: 0 0 20px 0; font-size: 22px;">🔥 ${firewall.name}</h2>
                            <div style="color: #e5e7eb; font-size: 15px; line-height: 1.8;">
                              <div style="margin: 10px 0;">
                                <span style="color: #9ca3af; display: inline-block; width: 100px;">📍 IP:</span>
                                <strong style="color: white;">${firewall.ip}:${firewall.port || 22}</strong>
                              </div>
                              <div style="margin: 10px 0;">
                                <span style="color: #9ca3af; display: inline-block; width: 100px;">💬 Mensaje:</span>
                                <strong style="color: ${statusColor};">${message}</strong>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Actions -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px; text-align: center;">
                      <a href="https://int3hub.ddns.net:32125" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-size: 14px; font-weight: bold; box-shadow: 0 2px 4px rgba(59,130,246,0.4);">
                        📊 Ver Dashboard
                      </a>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 30px; border-top: 1px solid #374151;">
                      <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
                        🕐 ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
                      </p>
                      <p style="color: #6b7280; font-size: 11px; margin: 10px 0 0 0; text-align: center;">
                        Este es un mensaje automático de Int3 Hub OnLine. No responder a este correo.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });
    console.log(`[Scheduler] Email sent to ${recipientEmails.length} recipient(s) for ${firewall.name}: ${subject}`);
  } catch (error) {
    console.error('[Scheduler] Error sending email:', error.message);
  }
}

/**
 * Enviar notificación por webhook
 */
async function sendWebhookNotification(subject, message, firewall, data) {
  const settings = currentSettings || reloadSettings();
  
  if (!settings.webhook_url) {
    return;
  }

  try {
    const response = await fetch(settings.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert: subject,
        message,
        firewall: {
          name: firewall.name,
          ip: firewall.ip
        },
        data,
        timestamp: new Date().toISOString()
      })
    });
    console.log(`[Scheduler] Webhook sent: ${subject} (${response.status})`);
  } catch (error) {
    console.error('[Scheduler] Error sending webhook:', error.message);
  }
}

/**
 * Conectar a firewall via SSH y obtener métricas
 */
async function connectToFirewall(firewall) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = '';
    let error = null;

    conn.on('ready', () => {
      conn.exec('pfctl -s info && uptime && df -h', (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        stream.on('data', (data) => {
          output += data.toString();
        }).on('close', () => {
          conn.end();
          resolve(output);
        }).stderr.on('data', (data) => {
          error = data.toString();
        });
      });
    });

    conn.on('error', (err) => {
      reject(err);
    });

    // Configurar autenticación
    const config = {
      host: firewall.ip,
      port: firewall.port || 22,
      username: firewall.user,
      readyTimeout: 10000,
      keepaliveInterval: 5000
    };

    if (firewall.key) {
      config.privateKey = firewall.key;
    } else if (firewall.password) {
      config.password = firewall.password;
    }

    conn.connect(config);
  });
}

/**
 * Parsear métricas básicas del output
 */
function parseMetrics(output) {
  const metrics = {
    uptime: 0,
    diskUsage: 0,
    status: 'unknown'
  };

  try {
    // Extraer uptime en días
    const uptimeMatch = output.match(/up\s+(\d+)\s+day/);
    if (uptimeMatch) {
      metrics.uptime = parseInt(uptimeMatch[1]);
    }

    // Extraer uso de disco
    const diskMatch = output.match(/(\d+)%/);
    if (diskMatch) {
      metrics.diskUsage = parseInt(diskMatch[1]);
    }

    // Estado básico
    if (output.includes('Status: Enabled')) {
      metrics.status = 'online';
    }
  } catch (error) {
    console.error('[Scheduler] Error parsing metrics:', error.message);
  }

  return metrics;
}

/**
 * Monitorear un firewall
 */
async function monitorFirewall(firewall) {
  const startTime = Date.now();
  const previousStatus = firewall.status;

  try {
    console.log(`[Scheduler] Monitoring ${firewall.name} (${firewall.ip})...`);
    
    const output = await connectToFirewall(firewall);
    const metrics = parseMetrics(output);
    
    // Actualizar estado en DB
    await updateFirewallStatus(firewall.id, 'online', metrics);

    // Notificar si cambió de offline a online
    if (previousStatus === 'offline' && currentSettings && currentSettings.notifications_enabled) {
      await sendEmailNotification(
        `Firewall ${firewall.name} is back online`,
        'The firewall has recovered and is now online.',
        firewall
      );
      await sendWebhookNotification(
        'Firewall recovered',
        'The firewall has recovered and is now online.',
        firewall,
        metrics
      );
    }

    // Alertar si disco > 80%
    if (metrics.diskUsage > 80 && currentSettings && currentSettings.notifications_enabled) {
      await sendEmailNotification(
        `High disk usage on ${firewall.name}`,
        `Disk usage is at ${metrics.diskUsage}%. Consider cleaning up.`,
        firewall
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[Scheduler] ✓ ${firewall.name} OK (${duration}ms)`);

  } catch (error) {
    console.error(`[Scheduler] ✗ ${firewall.name} FAILED:`, error.message);
    
    // Actualizar estado en DB
    await updateFirewallStatus(firewall.id, 'offline', { error: error.message });

    // Notificar si cambió de online a offline
    if (previousStatus === 'online' && currentSettings && currentSettings.notifications_enabled) {
      await sendEmailNotification(
        `Firewall ${firewall.name} is DOWN`,
        `Unable to connect: ${error.message}`,
        firewall
      );
      await sendWebhookNotification(
        'Firewall down',
        `Unable to connect: ${error.message}`,
        firewall,
        { error: error.message }
      );
    }
  }
}

/**
 * Ciclo principal de monitoreo
 */
async function monitoringCycle() {
  try {
    const firewalls = getFirewalls();
    console.log(`[Scheduler] Starting monitoring cycle (${firewalls.length} firewalls)`);

    // Monitorear todos en paralelo
    await Promise.allSettled(
      firewalls.map(fw => monitorFirewall(fw))
    );

    console.log('[Scheduler] Monitoring cycle completed');
  } catch (error) {
    console.error('[Scheduler] Error in monitoring cycle:', error.message);
  }
}

/**
 * Iniciar scheduler
 */
function startScheduler() {
  // Cargar configuración inicial
  const settings = reloadSettings();
  
  if (!settings) {
    console.error('[Scheduler] Failed to load settings, aborting');
    return;
  }
  
  console.log(`[Scheduler] Starting continuous monitoring (interval: ${settings.monitor_interval}ms)`);
  
  // Ejecutar inmediatamente
  monitoringCycle();
  
  // Ejecutar periódicamente
  if (monitorInterval) {
    clearInterval(monitorInterval);
  }
  monitorInterval = setInterval(() => {
    reloadSettings(); // Recargar config en cada ciclo
    monitoringCycle();
  }, settings.monitor_interval);
}

module.exports = { startScheduler, reloadSettings };
