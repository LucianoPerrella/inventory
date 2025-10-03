# 🚀 Guía de Despliegue - Inventory App con RDS

## 📋 Resumen de Cambios Implementados

### ✅ **Correcciones Críticas Aplicadas:**

1. **Variables de Entorno Corregidas** - `user_data.sh`

   - Variables de base de datos movidas a la sección `[Service]` correcta
   - Eliminada duplicación de variables de entorno

2. **Pool de Conexiones Mejorado** - `server.js`

   - Configuración optimizada para RDS
   - Reconexión automática
   - Monitoreo de salud cada 30 segundos
   - Logging detallado de operaciones

3. **Manejo de Errores Robusto**

   - Logging mejorado en todas las operaciones
   - Health check endpoint mejorado
   - Respuestas de error consistentes

4. **Archivo de Configuración** - `config.env`
   - Variables de entorno para desarrollo local
   - Configuración de logging

## 🛠️ **Instrucciones de Despliegue**

### **Paso 1: Verificar Configuración**

```bash
chmod +x verify-deployment.sh
./verify-deployment.sh
```

### **Paso 2: Desplegar en EC2**

```bash
# Opción A: Usar script CLI
chmod +x CLI.txt
./CLI.txt

# Opción B: Usar AWS Console con user_data.sh
```

### **Paso 3: Verificar Despliegue**

```bash
# Conectar a la instancia EC2
ssh -i inventory-key-cli.pem ubuntu@IP_PUBLICA

# Verificar logs del servicio
sudo journalctl -u inventory.service -f

# Verificar estado del servicio
sudo systemctl status inventory.service

# Verificar conectividad a RDS
curl http://localhost:3001/health
```

### **Paso 4: Verificar Aplicación**

```bash
# Health check completo
curl http://IP_PUBLICA/health

# Verificar API de productos
curl http://IP_PUBLICA/api/products

# Verificar estadísticas
curl http://IP_PUBLICA/api/stats
```

## 🔧 **Configuración de Desarrollo Local**

### **Usar archivo de configuración:**

```bash
# Copiar configuración
cp config.env .env

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm start
```

## 📊 **Monitoreo en Producción**

### **Logs Importantes:**

```bash
# Logs del servicio
sudo journalctl -u inventory.service -f

# Logs de user data
sudo cat /var/log/user-data.log

# Logs de nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### **Health Checks:**

- **Endpoint:** `http://IP_PUBLICA/health`
- **Respuesta esperada:**

```json
{
  "status": "healthy",
  "database": "connected",
  "responseTime": "15ms",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "PostgreSQL 15.4",
  "uptime": 3600
}
```

## 🚨 **Solución de Problemas**

### **Problema: Aplicación no se conecta a RDS**

```bash
# Verificar variables de entorno
sudo systemctl show inventory.service --property=Environment

# Verificar conectividad a RDS
telnet inventorydb.cz6imua8gy2g.us-east-1.rds.amazonaws.com 5432

# Verificar logs de conexión
sudo journalctl -u inventory.service | grep -i "rds\|postgres\|error"
```

### **Problema: Servicio no inicia**

```bash
# Verificar configuración del servicio
sudo systemctl cat inventory.service

# Reiniciar servicio
sudo systemctl restart inventory.service

# Verificar permisos
ls -la /opt/inventory/
```

## 📈 **Métricas de Rendimiento**

### **Configuración del Pool:**

- **Máximo de conexiones:** 20
- **Mínimo de conexiones:** 2
- **Timeout de conexión:** 10 segundos
- **Verificación de salud:** Cada 30 segundos

### **Endpoints de Monitoreo:**

- `GET /health` - Estado general de la aplicación
- `GET /api/stats` - Estadísticas de productos
- `GET /api/products` - Lista de productos

## 🔒 **Seguridad**

### **Configuración SSL:**

- SSL habilitado para RDS
- `rejectUnauthorized: false` para certificados auto-firmados
- Conexiones encriptadas

### **Variables de Entorno:**

- Credenciales de base de datos en variables de entorno
- No hardcodeadas en el código
- Configuración separada para desarrollo y producción

---

## ✅ **Estado Final**

Tu aplicación ahora tiene:

- ✅ **Persistencia completa con RDS**
- ✅ **Reconexión automática**
- ✅ **Logging detallado**
- ✅ **Health checks robustos**
- ✅ **Manejo de errores mejorado**
- ✅ **Configuración de producción optimizada**

**¡Tu aplicación está lista para producción!** 🎉
