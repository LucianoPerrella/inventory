📦 Inventory App (Node.js + Express + PostgreSQL/RDS)
📝 Descripción del Proyecto
Inventory App es una aplicación de gestión de inventario básica construida en Node.js y Express que permite crear, leer, actualizar y eliminar (CRUD) productos en una base de datos PostgreSQL persistente.

El objetivo principal de este proyecto, además de la funcionalidad CRUD, es demostrar la automatización y el despliegue de una aplicación web moderna en la infraestructura de Amazon Web Services (AWS).

🛠️ Stack Tecnológico
Componente

Tecnología

Propósito

Backend

Node.js (v18)

Entorno de ejecución del servidor.

Framework

Express.js

Framework minimalista para la API REST.

Base de Datos

PostgreSQL (RDS)

Almacenamiento persistente de los datos de inventario.

Driver DB

pg (node-postgres)

Cliente para interactuar con la base de datos.

Web Server

Nginx

Proxy inverso para manejar el tráfico HTTP (puerto 80) y dirigirlo a la aplicación Node.js (puerto 3001).

🚀 Despliegue en AWS (EC2/RDS)
El despliegue está diseñado para ser completamente automatizado utilizando el mecanismo de User Data de AWS, que ejecuta un script de aprovisionamiento en Bash al iniciar la instancia EC2.

1. Pre-requisitos de Infraestructura
Para el despliegue se requiere:

Instancia EC2 (Ubuntu 20.04/22.04): Para alojar la aplicación Node.js.

Instancia RDS (PostgreSQL): Base de datos configurada.

Configuración de Red:

Grupo de Seguridad de RDS: Debe permitir tráfico de entrada (Inbound) en el puerto 5432 únicamente desde el Grupo de Seguridad del EC2.

Grupo de Seguridad de EC2: Debe permitir tráfico de salida (Outbound) al puerto 5432 y tráfico de entrada (Inbound) al puerto 80 (HTTP).

2. Archivos Clave
Archivo

Función

server.js

Contiene la lógica de la API, el pool de conexiones PostgreSQL y la función de bootstrapping (CREATE TABLE IF NOT EXISTS products...) para inicializar la base de datos.

user_data.sh (Script)

Script de automatización que instala dependencias, clona el código, configura el servicio Systemd con las credenciales de RDS e instala Nginx.

inventory.service

Archivo de configuración de Systemd que mantiene la aplicación corriendo en segundo plano y la reinicia automáticamente en caso de fallos.

3. Proceso de Despliegue Automatizado (User Data)
El script de User Data realiza las siguientes tareas al iniciar la instancia:

Instalación: Instala git, curl, nginx y el runtime de Node.js (v18).

Clonación: Clona el repositorio a /opt/inventory e instala las dependencias de NPM.

Systemd Setup: Crea el archivo inventory.service y configura las variables de entorno de RDS (DB_HOST, DB_USER, DB_PASS, etc.) para que la aplicación pueda conectarse.

Servicio: Recarga el demonio de Systemd, habilita e inicia el servicio inventory.service.

Proxy Nginx: Configura Nginx para actuar como un proxy inverso, dirigiendo todo el tráfico entrante del puerto 80 al puerto 3001, donde se ejecuta la aplicación Node.js.

💡 Notas Importantes sobre Conectividad
La persistencia de datos se garantiza con la conexión a PostgreSQL.

El archivo server.js incluye un mecanismo de Health Check y manejo de errores de conexión para diagnosticar problemas de red o credenciales.

Si la base de datos se inicia vacía, el proceso de bootstrapping insertará productos de ejemplo automáticamente.
