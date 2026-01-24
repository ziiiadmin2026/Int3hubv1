/**
 * API endpoints para configuración del sistema
 */

// GET /api/settings - Obtener configuración actual
async function getSettings(req, res) {
  const { getSettings } = require('./db');
  
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (error) {
    console.error('[Settings] Error getting settings:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
}

// POST /api/settings - Guardar configuración
async function saveSettings(req, res) {
  const { saveSettings } = require('./db');
  
  try {
    const settings = req.body;
    saveSettings(settings);
    res.json({ success: true });
  } catch (error) {
    console.error('[Settings] Error saving settings:', error);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
}

// POST /api/settings/test-email - Enviar email de prueba
async function testEmail(req, res) {
  const { getSettings } = require('./db');
  const nodemailer = require('nodemailer');
  
  try {
    const settings = getSettings();
    
    // Para test email, no requerimos que las notificaciones estén activadas
    // Solo validamos que la configuración esté completa
    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
      return res.status(400).json({ error: 'Configuración SMTP incompleta (host, usuario o contraseña faltante)' });
    }
    
    if (!settings.alert_emails || settings.alert_emails.length === 0) {
      return res.status(400).json({ error: 'No hay correos de alerta configurados' });
    }
    
    console.log('[Settings] Attempting to send test email with config:');
    console.log('  Host:', settings.smtp_host);
    console.log('  Port:', settings.smtp_port);
    console.log('  User:', settings.smtp_user);
    console.log('  Pass:', settings.smtp_pass ? '***' + settings.smtp_pass.slice(-4) : 'NOT SET');
    
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: false, // Use TLS via STARTTLS
      requireTLS: true, // Require TLS
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      }
    });
    
    await transporter.sendMail({
      from: settings.smtp_from || settings.smtp_user,
      to: settings.alert_emails.join(', '),
      subject: '✅ [IntHub Test] Email de Prueba',
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
                      <p style="color: #e0e7ff; margin: 0; font-size: 14px;">Sistema de Monitoreo Multi-Firewall</p>
                    </td>
                  </tr>
                  
                  <!-- Badge -->
                  <tr>
                    <td style="padding: 30px; text-align: center;">
                      <div style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                        ✓ EMAIL DE PRUEBA
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px;">
                      <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Este es un email de prueba del sistema de notificaciones de IntHub. Si estás recibiendo este mensaje, la configuración SMTP está funcionando correctamente.
                      </p>
                      
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1f2937; border-radius: 6px; padding: 20px;">
                        <tr>
                          <td style="color: #9ca3af; font-size: 14px; padding-bottom: 15px;">
                            <strong style="color: #3b82f6; display: block; margin-bottom: 10px;">📋 Configuración Actual:</strong>
                            <div style="margin-left: 10px;">
                              <div style="margin: 8px 0;">🌐 <strong>SMTP Host:</strong> ${settings.smtp_host}</div>
                              <div style="margin: 8px 0;">🔌 <strong>Puerto:</strong> ${settings.smtp_port}</div>
                              <div style="margin: 8px 0;">📧 <strong>Remitente:</strong> ${settings.smtp_from || settings.smtp_user}</div>
                              <div style="margin: 8px 0;">📬 <strong>Destinatarios:</strong> ${settings.alert_emails.join(', ')}</div>
                            </div>
                          </td>
                        </tr>
                      </table>
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
    
    console.log('[Settings] ✓ Test email sent to:', settings.alert_emails.join(', '));
    res.json({ success: true, message: 'Email enviado correctamente' });
  } catch (error) {
    console.error('[Settings] Error sending test email:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getSettings, saveSettings, testEmail };
