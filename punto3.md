Consigna

Preparar la aplicación para desplegarla en Elastic Beanstalk.

Ejecutar el despliegue y comprobar que la app queda disponible en la URL asignada.

Destacar las diferencias frente a desplegarlo en EC2 (manual/CLI).

Elastic Beanstalk (EB) es una plataforma PaaS que gestiona provisioning, despliegue, balanceo, autoscaling y health-checks por vos. Para una app Node.js normalmente no necesitás Docker: EB usa el start script de package.json o un Procfile para arrancar. El flujo típico:

Preparar el proyecto para EB (archivos mínimos).

Instalar y configurar EB CLI (o usar AWS Console / AWS CLI).

eb init → eb create → eb open (o usar aws elasticbeanstalk para versiones/entorno).

Verificar URL y logs.

1. Preparar el proyecto local

Antes de subirlo a Elastic Beanstalk:

Verificá que en package.json tengas un script start válido:

"scripts": {
  "start": "node server.js"
}

Comprimí los archivos de tu aplicación en un .zip (sin incluir node_modules/ ni .git/).
Ejemplo: seleccionás todo (server.js, package.json, Procfile si lo tenés) → clic derecho → “Comprimir en .zip”.

2. Entrar a Elastic Beanstalk en la consola

Ingresá a la consola de AWS → buscá Elastic Beanstalk en la barra de búsqueda.

Hacé clic en Create application.

3. Crear la aplicación

Application name → poné un nombre, por ejemplo: inventory-app.

(Opcional) Descripción → breve texto.

Platform → seleccioná:

Platform: Node.js

Platform branch: Node.js 18 running on 64bit Amazon Linux 2 (o la más nueva que aparezca).

Application code → elegí Upload your code.

Subí tu .zip del proyecto.

4. Configurar el entorno

Environment name → por ejemplo: inventory-env.

Domain → podés personalizar el subdominio (ej: inventory-env) → quedará algo tipo:

http://inventory-env.us-east-1.elasticbeanstalk.com

5. Lanzar el entorno

Hacé clic en Create environment.

AWS va a:

Crear un grupo de seguridad.

Crear un balanceador (si no es single instance).

Crear un EC2 con tu aplicación.

Configurar health checks.

Esto puede tardar 5–10 minutos.

6. Verificar la aplicación

Una vez en estado Health: Ok, hacé clic en el link de la URL del entorno que aparece arriba (ej: http://inventory-env.us-east-1.elasticbeanstalk.com).

Tu app debería estar corriendo.

 — Diferencias clave: Elastic Beanstalk vs EC2 (manual/CLI)
Elastic Beanstalk (PaaS — administrado)

Abstracción/Automatización: EB gestiona provisioning, balanceo, auto-scaling, health checks, rollbacks automáticos y versioning.

Despliegue simplificado: eb deploy o subir un ZIP y EB hace el resto (instala dependencias, ejecuta start).

Menos configuración manual: no necesitás crear systemd, configurar nginx manualmente (EB ya provee proxy reverse y health checks).

Escalabilidad: soporte out-of-the-box para Auto Scaling y Load Balancer.

Menos control de bajo nivel: menos acceso directo a la infraestructura (aunque podés customizar con .ebextensions o .platform).

Ideal para: despliegues rápidos, staging, aplicaciones donde no querés manejar infra diaria.

EC2 (IaaS — manual/CLI)

Control total: administrás AMI, paquetes, systemd, nginx, configuraciones OS y seguridad (mejor control para necesidades específicas).

Mayor complejidad: hay que orquestar balanceo, scaling, monitoreo y actualización por tu cuenta (o con scripts/terraform/ansible).

Mayor responsabilidad: backups, parches, disponibilidad, logging y escalado son gestionados por vos.

Mejor cuando: necesitás personalizaciones OS profundas, dependencias nativas específicas, o arquitecturas fuera del patrón web app estándar.

Resumen práctico

Si querés rapidez y menos mantenimiento → Elastic Beanstalk.

Si querés control fino y personalización → EC2 (o usar containers en ECS/EKS).
