📦 Inventario de Productos (Node.js + Express + PostgreSQL/RDS)
📝 Descripción General
Inventory App es una aplicación de gestión de inventario basada en Node.js y Express. Permite realizar operaciones CRUD (Crear, Leer, Actualizar, Eliminar) sobre productos almacenados en una base de datos PostgreSQL.

El enfoque de este proyecto es la automatización del despliegue en la nube, utilizando Amazon Web Services (AWS).

🛠️ Stack Tecnológico
Componente

Tecnología

Propósito

Backend

Node.js (v18)

Entorno de ejecución del servidor.

Framework

Express.js

Framework minimalista para crear la API REST.

Base de Datos

PostgreSQL (RDS)

Almacenamiento persistente y escalable.

Driver DB

pg (node-postgres)

Cliente para la interacción entre la aplicación y la base de datos.

Proxy Web

Nginx

Servidor proxy inverso, dirige el tráfico HTTP (puerto 80) a la aplicación Node.js (puerto 3001).

🚀 Despliegue Automatizado en AWS
El despliegue de la aplicación en una instancia EC2 es completamente automatizado a través del script User Data de AWS.

1. Pre-requisitos de Infraestructura y Red
Para un despliegue exitoso, la infraestructura debe cumplir con los siguientes requisitos:

Instancia EC2 (Ubuntu): Servidor de la aplicación.

Instancia RDS (PostgreSQL): Servicio de base de datos.

Configuración de Grupos de Seguridad:

RDS Inbound: Permitir tráfico en el puerto 5432 solo desde el ID del Grupo de Seguridad del EC2.

EC2 Outbound: Permitir tráfico saliente en el puerto 5432.

EC2 Inbound: Permitir tráfico entrante en el puerto 80 (HTTP) desde Internet (0.0.0.0/0).

2. Archivos Clave del Despliegue
Archivo

Rol en el Despliegue

server.js

Contiene la lógica de conexión a PostgreSQL y la función de bootstrapping para crear la tabla products e insertar datos de ejemplo si la DB está vacía.

user_data.sh (Script)

Script de automatización que aprovisiona el servidor (instala Node.js, configura Systemd y Nginx).

inventory.service

Archivo de configuración de Systemd que gestiona la aplicación como un servicio en segundo plano, asegurando su reinicio automático.

3. Fases del Proceso Automatizado (User Data)
El script de User Data ejecuta las siguientes tareas:

Instalación de Dependencias: Instala Node.js, Nginx, Git y utilidades básicas.

Clonación y Configuración: Clona el repositorio a /opt/inventory e instala las dependencias de NPM.

Systemd Setup: Crea el servicio inventory.service, inyectando las variables de entorno de RDS (DB_HOST, DB_USER, DB_PASS, etc.) para permitir la conexión a la base de datos.

Inicio del Servicio: Habilita e inicia el servicio inventory.service para que la aplicación comience a correr en el puerto 3001.

Proxy Nginx: Configura y reinicia Nginx para que escuche el tráfico web en el puerto 80 y lo redirija (proxy inverso) al puerto 3001.

💡 Notas de Persistencia y Mantenimiento
Conexión DB: La aplicación usa process.env para obtener las credenciales de la base de datos, lo que la hace portable a cualquier entorno (EC2, Elastic Beanstalk, local).

Bootstrapping: El server.js asegura que el esquema de la tabla products esté siempre disponible, incluso si se conecta a una base de datos recién creada.

Monitoreo: El estado del servicio puede ser verificado en la instancia EC2 con sudo systemctl status inventory.service.
