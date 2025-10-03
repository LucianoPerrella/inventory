#!/bin/bash
set -e
touch /var/log/user-data.log
exec > /var/log/user-data.log 2>&1

echo "=========================================="
echo "INICIO INSTALACION: $(date)"
echo "=========================================="

export DEBIAN_FRONTEND=noninteractive

echo "Actualizando sistema..."
apt-get update -y
apt-get install -y git curl build-essential python3 nginx

echo "Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "Clonando repositorio..."
rm -rf /opt/inventory
git clone https://github.com/LucianoPerrella/inventory /opt/inventory

echo "Configurando permisos..."
chown -R ubuntu:ubuntu /opt/inventory

echo "Instalando dependencias npm..."
cd /opt/inventory
# Usar --production para instalar solo dependencias de producción
sudo -u ubuntu npm install --production

echo "Verificando server.js..."
ls -la server.js

echo "Creando servicio systemd..."
cat > /etc/systemd/system/inventory.service <<'EOF'
[Unit]
Description=Inventory App
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/inventory
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment="PORT=3001"
Environment="NODE_ENV=production"
# **CORRECCIÓN AQUÍ: Quitadas las comillas dobles que encerraban el valor de la URL**
Environment="DB_HOST=inventory.cz6imua8gy2g.us-east-1.rds.amazonaws.com"
Environment="DB_PORT=5432"
Environment="DB_USER=postgres"
Environment="DB_PASS=inventory"
Environment="DB_NAME=inventory"

[Install]
WantedBy=multi-user.target
EOF

echo "Contenido del archivo de servicio:"
cat /etc/systemd/system/inventory.service

echo "Iniciando servicio..."
systemctl daemon-reload
systemctl enable inventory.service
systemctl start inventory.service

echo "Esperando que inicie..."
sleep 15

echo "Estado del servicio:"
systemctl status inventory.service --no-pager || true

echo "Logs del servicio:"
journalctl -u inventory.service -n 20 --no-pager || true

echo "Configurando Nginx..."
cat > /etc/nginx/sites-available/inventory <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

echo "Habilitando sitio..."
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/inventory /etc/nginx/sites-enabled/inventory

echo "Testeando configuracion Nginx..."
nginx -t

echo "Reiniciando Nginx..."
systemctl enable nginx
systemctl restart nginx

PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "NO_DISPONIBLE")

echo "=========================================="
echo "INSTALACION COMPLETADA: $(date)"
echo "Aplicacion disponible en: http://$PUBLIC_IP"
echo "=========================================="
