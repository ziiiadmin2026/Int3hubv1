/**
 * Script de prueba para simular alerta de firewall caído
 */

require('dotenv').config();
const { getSettings } = require('./db');
const nodemailer = require('nodemailer');

async function sendTestAlert() {
  const settings = getSettings();
  
  console.log('[Test] Configuración cargada:', {
    enabled: settings.notifications_enabled,
    host: settings.smtp_host,
    user: settings.smtp_user,
    emails: settings.alert_emails
  });
  
  if (!settings.smtp_user || !settings.alert_emails || settings.alert_emails.length === 0) {
    console.error('[Test] Error: Configuración incompleta');
    return;
  }
  
  // Firewall de prueba
  const firewall = {
    name: 'PfSense Office Principal',
    ip: '192.168.1.1',
    port: 22
  };
  
  const subject = 'Firewall RECOVERED - Enlace Restablecido';
  const message = 'El firewall ha vuelto a estar en línea. Conexión SSH restablecida correctamente.';
  
  // Determinar tipo de alerta
  const isDown = false;
  const statusColor = '#10b981';
  const statusBg = '#064e3b';
  const statusIcon = '🟢';
  const statusText = 'ENLACE RESTABLECIDO';
  
  console.log('[Test] Creando transporter SMTP...');
  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port,
    secure: false,
    requireTLS: true,
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  console.log('[Test] Enviando email de alerta...');
  
  try {
    await transporter.sendMail({
      from: settings.smtp_from || settings.smtp_user,
      to: settings.alert_emails.join(', '),
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
    
    console.log('[Test] ✓ Email de alerta enviado exitosamente!');
    console.log(`[Test] Destinatarios: ${settings.alert_emails.join(', ')}`);
  } catch (error) {
    console.error('[Test] Error enviando email:', error.message);
  }
}

sendTestAlert().then(() => {
  console.log('[Test] Prueba completada');
  process.exit(0);
}).catch(err => {
  console.error('[Test] Error:', err);
  process.exit(1);
});
