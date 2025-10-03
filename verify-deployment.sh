#!/bin/bash

echo "=========================================="
echo "VERIFICACIÓN DE CONFIGURACIÓN DE DESPLIEGUE"
echo "=========================================="

# Verificar que las variables de entorno estén configuradas
echo "🔍 Verificando variables de entorno en user_data.sh..."
if grep -q "DB_HOST=inventorydb.cz6imua8gy2g.us-east-1.rds.amazonaws.com" user_data.sh; then
    echo "✅ DB_HOST configurado correctamente"
else
    echo "❌ DB_HOST NO encontrado en user_data.sh"
fi

if grep -q "DB_PORT=5432" user_data.sh; then
    echo "✅ DB_PORT configurado correctamente"
else
    echo "❌ DB_PORT NO encontrado en user_data.sh"
fi

if grep -q "DB_USER=postgres" user_data.sh; then
    echo "✅ DB_USER configurado correctamente"
else
    echo "❌ DB_USER NO encontrado en user_data.sh"
fi

if grep -q "DB_PASS=inventory" user_data.sh; then
    echo "✅ DB_PASS configurado correctamente"
else
    echo "❌ DB_PASS NO encontrado en user_data.sh"
fi

if grep -q "DB_NAME=inventorydb" user_data.sh; then
    echo "✅ DB_NAME configurado correctamente"
else
    echo "❌ DB_NAME NO encontrado en user_data.sh"
fi

echo ""
echo "🔍 Verificando configuración del servicio systemd..."
if grep -q "Environment=\"DB_HOST" user_data.sh; then
    echo "✅ Variables de entorno en sección [Service]"
else
    echo "❌ Variables de entorno NO están en sección [Service]"
fi

echo ""
echo "🔍 Verificando archivos de configuración..."
if [ -f "config.env" ]; then
    echo "✅ Archivo config.env creado"
else
    echo "❌ Archivo config.env NO encontrado"
fi

if [ -f "server.js" ]; then
    echo "✅ server.js existe"
    if grep -q "checkDatabaseHealth" server.js; then
        echo "✅ Función de verificación de salud implementada"
    else
        echo "❌ Función de verificación de salud NO implementada"
    fi
else
    echo "❌ server.js NO encontrado"
fi

echo ""
echo "🔍 Verificando dependencias en package.json..."
if grep -q "\"pg\":" package.json; then
    echo "✅ PostgreSQL driver (pg) configurado"
else
    echo "❌ PostgreSQL driver (pg) NO configurado"
fi

if grep -q "\"express\":" package.json; then
    echo "✅ Express framework configurado"
else
    echo "❌ Express framework NO configurado"
fi

echo ""
echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Ejecutar: chmod +x verify-deployment.sh"
echo "2. Ejecutar: ./verify-deployment.sh"
echo "3. Si todo está ✅, desplegar con: ./CLI.txt"
echo "4. Verificar logs en EC2: sudo journalctl -u inventory.service -f"
echo "5. Verificar health: curl http://IP_PUBLICA/health"
echo ""
