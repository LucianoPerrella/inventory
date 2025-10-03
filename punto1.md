Consigna

Levantar una aplicación Node.js en un servidor virtual (AWS EC2) de dos formas:

Manual — realizar todos los pasos desde la consola AWS y por SSH (instalación dependencias, configuración puertos, ejecución servicio).

Semi-automatizado — usar el script en User Data como primer paso de automatización (script incluido en el apéndice).

Instancia manual: ec2-3-89-139-249.compute-1.amazonaws.com

Resumen de la solución

La aplicación (Inventory App) se despliega en una instancia EC2 Ubuntu. Localmente Node corre en puerto 3001 y Nginx actúa como proxy inverso exponiendo la app en puerto 80. Se crea un servicio systemd para ejecutar la app de forma persistente.

A. Pasos manuales en la consola de AWS (crear y preparar la EC2)

Abrir consola AWS → EC2 → Instances → Launch instances

AMI: elegir Ubuntu Server 22.04 LTS (x86_64) (u otra LTS).

Instance type: p.ej. t3.micro (según requerimientos y cuenta).

Key pair: seleccionar o crear un par de claves (descargar el .pem). Guardalo en un lugar seguro.

Network settings:

Subnet -> elegir una que permita Auto-assign Public IPv4 (o asignar Elastic IP luego).

Security group (configurar inbound rules):

SSH (TCP 22) — Source: My IP (recomendado) o IPs administradoras.

HTTP (TCP 80) — Source: 0.0.0.0/0 (si la aplicación debe ser pública).

(Opcional) Custom TCP 3001 — Source: My IP (solo si necesitás acceder directamente a Node).

Nunca abrir 22/3001 a 0.0.0.0/0 en producción sin control.

Storage: tamaño acorde (p.ej. 8–20 GB).

Tags: agregar nombre descriptivo.

Launch.

Esperar a que la instancia esté running y anotar la Public IPv4 (o asignar un Elastic IP desde Network → Elastic IPs y asociarlo).

Pasos manuales en el servidor (comandos a ejecutar por SSH)

Ejecutar con sudo cuando sea requerido. Este bloque está pensado para copia/pegado.

# 1. Actualizar y preparar
sudo apt update -y
sudo apt upgrade -y

# 2. Instalar utilidades básicas
sudo apt install -y git curl build-essential python3 nginx

# 3. Instalar Node.js 18 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Verificar instalaciones
node --version
npm --version
git --version
nginx -v

# 5. Clonar repositorio (ejemplo)
sudo rm -rf /opt/inventory
sudo git clone https://github.com/LucianoPerrella/inventory /opt/inventory
sudo chown -R ubuntu:ubuntu /opt/inventory

# 6. Instalar dependencias npm (como usuario de la app)
cd /opt/inventory
sudo -u ubuntu npm install --production

# 7. Probar ejecución directa (verificar que server.js levanta)
sudo -u ubuntu node server.js &    # para prueba rápida (detener luego)
# o preferible: configurar systemd (siguiente paso)

# 8. Crear servicio systemd (archivo /etc/systemd/system/inventory.service)
sudo tee /etc/systemd/system/inventory.service > /dev/null <<'EOF'
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

[Install]
WantedBy=multi-user.target
EOF

# 9. Habilitar e iniciar servicio
sudo systemctl daemon-reload
sudo systemctl enable inventory.service
sudo systemctl start inventory.service

# 10. Verificar servicio
sudo systemctl status inventory.service --no-pager
# logs:
sudo journalctl -u inventory.service -f

# 11. Configurar Nginx como proxy inverso (archivo /etc/nginx/sites-available/inventory)
sudo tee /etc/nginx/sites-available/inventory > /dev/null <<'EOF'
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

# 12. Habilitar sitio y reiniciar nginx
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/inventory /etc/nginx/sites-enabled/inventory
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

# 13. Verificar que Node escucha en 3001 (local)
ss -tuln | grep 3001 || echo "Puerto 3001 no detectado"

# 14. Probar desde la instancia
curl -I http://127.0.0.1:3001   # respuesta del app
curl -I http://127.0.0.1        # respuesta vía nginx

# 15. Probar desde tu máquina (usar la Public IPv4)
curl -I http://<PUBLIC_IP>

-----------------------------

Consigna 2

Instancia automatizada: ec2-3-84-200-127.compute-1.amazonaws.com

En la instancia seleccionada, se necesita modificar User Data con el siguiente script:
USER DATA
#!/bin/bash
set -e

# Crear log desde el principio
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

[Install]
WantedBy=multi-user.target
EOF

echo "Iniciando servicio..."
systemctl daemon-reload
systemctl enable inventory.service
systemctl start inventory.service

echo "Esperando que inicie..."
sleep 15

echo "Estado del servicio:"
systemctl status inventory.service --no-pager || true

echo "Verificando puerto 3001..."
netstat -tlnp | grep 3001 || echo "Puerto no detectado aun"

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

Aclaración: en el punto 4 se modifica el proyecto. Actualmente, en esta instancia corre con el siguiente userdata para incluir RDS y PostGres:
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

