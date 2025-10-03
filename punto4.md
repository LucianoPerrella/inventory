📦 Inventario de Productos (Node.js + Express + PostgreSQL/RDS)
📝 Descripción General
Inventory App es una aplicación de gestión de inventario basada en Node.js y Express. Su función principal es permitir operaciones CRUD (Crear, Leer, Actualizar, Eliminar) sobre productos que se almacenan de manera persistente en una base de datos PostgreSQL.

El objetivo clave de este proyecto es demostrar la automatización del despliegue en un servidor virtual, específicamente utilizando Amazon Web Services (AWS).

🛠️ Stack Tecnológico
El proyecto se basa en los siguientes componentes tecnológicos:

Backend: Node.js (v18), utilizado como entorno de ejecución del servidor.

Framework: Express.js, el framework minimalista para crear la API REST.

Base de Datos: PostgreSQL (RDS), para el almacenamiento persistente y escalable de los datos.

Driver DB: pg (node-postgres), el cliente utilizado para interactuar con la base de datos.

Proxy Web: Nginx, configurado como servidor proxy inverso para dirigir el tráfico HTTP (puerto 80) a la aplicación Node.js (puerto 3001).

🚀 Despliegue Automatizado en AWS
El despliegue en la instancia EC2 se realiza de forma completamente automatizada mediante el script User Data de AWS.

1. Pre-requisitos de Infraestructura y Red
Para un despliegue exitoso, se deben configurar los siguientes elementos de infraestructura en AWS:

Instancia EC2 (Ubuntu): Servidor principal de la aplicación.

Instancia RDS (PostgreSQL): La base de datos persistente.

Configuración de Grupos de Seguridad:

RDS Inbound: Debe permitir el tráfico entrante en el puerto 5432 solo desde el Grupo de Seguridad asociado al EC2.

EC2 Outbound: Debe permitir el tráfico saliente en el puerto 5432 para conectarse a RDS.

EC2 Inbound: Debe permitir el tráfico entrante en el puerto 80 (HTTP) desde Internet.

2. Archivos Clave del Despliegue
Los componentes esenciales para el funcionamiento y despliegue son:

server.js: Contiene la lógica de conexión a PostgreSQL, el manejo de errores, y la función de bootstrapping que crea la tabla products e inserta datos de ejemplo si la DB está vacía.

user_data.sh (Script): Es el script de automatización que aprovisiona el servidor (instala Node.js, configura Systemd y Nginx).

inventory.service: Archivo de configuración de Systemd que gestiona la aplicación como un servicio en segundo plano, asegurando su reinicio automático en caso de fallos.

3. Fases del Proceso Automatizado (User Data)
El script de User Data ejecuta las siguientes tareas:

Instalación: Instala Node.js, Nginx, Git y utilidades necesarias.

Clonación y Dependencias: Clona el repositorio e instala las dependencias de NPM.

Configuración de Systemd: Crea el archivo inventory.service e inyecta las variables de entorno de RDS (DB_HOST, DB_USER, etc.) para habilitar la conexión.

Inicio del Servicio: Habilita e inicia el servicio inventory.service.

Proxy Nginx: Configura el servidor Nginx para redirigir todo el tráfico del puerto 80 al puerto 3001, donde corre la aplicación.

💡 Notas Adicionales
Persistencia: La aplicación garantiza la persistencia mediante el uso de PostgreSQL.

Bootstrapping: El server.js está diseñado para autoinicializar el esquema de la base de datos (crear la tabla si no existe), lo que facilita el despliegue en entornos nuevos.

Monitoreo: El estado del servicio puede ser verificado en la instancia EC2 con el comando sudo systemctl status inventory.service.
