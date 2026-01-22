# Despliegue en VM Debian (Proxmox) usando Docker

Resumen rápido:
- Crear VM Debian en Proxmox
- Instalar Docker y Docker Compose
- Copiar certificados (si terminas TLS en `nginx`) o configurar HAProxy/terminación TLS en `pfsense`
- Levantar `docker-compose up -d`

Pasos resumidos:

1) Crear VM en Proxmox
   - Recomendado: Debian 12/11 (stable)
   - CPU, RAM y disco según carga

2) Preparar VM (como `root` o usuario con sudo)

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg lsb-release
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
mkdir -p /etc/docker
systemctl enable --now docker
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

3) Transferir el proyecto a la VM (git clone o scp)

4) Certificados
- Opción A (recomendada si ya usas pfsense): Termina TLS en `pfsense`/HAProxy y hace proxy hacia la VM por HTTP interno.
- Opción B: Usa ACME/Let's Encrypt en la VM (certbot o acme.sh) y monta `./certs` con `fullchain.pem` y `privkey.pem`.

5) Iniciar servicios

```bash
cd /ruta/al/proyecto
docker-compose pull || true
docker-compose build --pull
docker-compose up -d
```

6) Observabilidad y mantenimiento
- Logs: `docker-compose logs -f nginx` / `docker-compose logs -f app`
- Actualizaciones: reconstruir la imagen y redeploy
- Backups: base de datos y volúmenes

Notas de seguridad:
- Mantén claves privadas con permisos `600` y propiedad `root`.
- No distribuyas claves por email en texto plano; usa scp/sftp.
- Habilita actualizaciones de seguridad automáticas en la VM.
