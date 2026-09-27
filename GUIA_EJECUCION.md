# Guía de Ejecución y Pruebas del Backend (Serverless & Local)

Esta guía detalla los pasos para configurar, ejecutar y validar la API de Solicitudes Académicas, diseñada con arquitectura **Serverless (AWS Lambda + AWS SAM / Mangum)**, securizada con **Keycloak (OAuth 2.0 / RBAC)** y con emisión reactiva de eventos a **Apache Kafka**.

---

## 1. Prerrequisitos e Instalación

### Requisitos Previos
- **Python 3.10** o superior instalado en el sistema.
- Gestor de paquetes `pip` y soporte de entornos virtuales (`venv`).
- **AWS SAM CLI** y **Docker** (únicamente necesarios para la simulación del entorno Serverless con `sam local start-api`).

### Pasos de Instalación

1. **Crear un entorno virtual de Python**:
   ```bash
   python3 -m venv .venv
   ```

2. **Activar el entorno virtual**:
   - En Linux / macOS:
     ```bash
     source .venv/bin/activate
     ```
   - En Windows (PowerShell):
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```

3. **Instalar las dependencias del proyecto**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

---

## 2. Configuración de Entorno (`.env` y `template.yaml`)

La aplicación requiere la configuración de las credenciales y URLs para el proveedor de identidad (Keycloak) y el clúster de Apache Kafka.

> **Aviso de Seguridad:** Nunca expongas valores reales, credenciales o URLs privadas en repositorios públicos. Mantén el archivo `.env` agregado a tu `.gitignore`.

### Estructura General del Archivo `.env` (Desarrollo Local Directo)

Crea un archivo `.env` en la raíz del proyecto:

```ini
# Configuración del Identity Provider (Keycloak)
KEYCLOAK_SERVER_URL=https://<HOST_O_DOMINIO_KEYCLOAK>
KEYCLOAK_REALM=<NOMBRE_DEL_REALM>

# Configuración del Clúster Apache Kafka
KAFKA_BOOTSTRAP_SERVERS=<HOST_BROKER_KAFKA>:<PUERTO>

# (Opcional) Nombres personalizados de tópicos de Kafka
KAFKA_TOPIC_REQUESTS=<NOMBRE_TOPICO_SOLICITUDES>
KAFKA_TOPIC_REVIEWS=<NOMBRE_TOPICO_REVISIONES>
KAFKA_TOPIC_NOTIFICATIONS=<NOMBRE_TOPICO_NOTIFICACIONES>
KAFKA_TOPIC_ANALYTICS=<NOMBRE_TOPICO_ANALITICA>
```

### Inyección de Variables en AWS SAM (`template.yaml`)

Para ejecuciones locales en contenedor Lambda con `sam local start-api`, las variables están declaradas en la sección `Globals.Function.Environment.Variables` del archivo `template.yaml`. También puedes sobreescribirlas opcionalmente con un archivo `env.json`:

```json
{
  "Parameters": {
    "KEYCLOAK_SERVER_URL": "https://<HOST_KEYCLOAK>",
    "KEYCLOAK_REALM": "<NOMBRE_REALM>",
    "KAFKA_BOOTSTRAP_SERVERS": "<HOST_KAFKA>:<PUERTO>"
  }
}
```

---

## 3. Ejecución del Servidor

Puedes levantar el proyecto bajo dos modalidades según tu flujo de trabajo:

### Modalidad A: Entorno Serverless con AWS SAM (`sam local start-api`)

Esta modalidad simula el entorno efímero real de AWS Lambda mediante contenedores Docker y el adaptador **Mangum**:

1. Asegúrate de tener **Docker** en ejecución.
2. Compila el artefacto de la aplicación:
   ```bash
   sam build
   ```
3. Inicia el servidor HTTP API local:
   ```bash
   sam local start-api --port 8000
   ```
   *(Si utilizas un archivo de variables externo, agrega `--env-vars env.json`)*.

La API responderá a través del handler de Lambda `main.handler` en `http://localhost:8000`.

---

### Modalidad B: Servidor de Desarrollo Rápido con Uvicorn

Para iteración ágil y pruebas inmediatas de código sin necesidad de compilar con Docker:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

La API quedará accesible inmediatamente en `http://localhost:8000`.

---

## 4. Guía de Pruebas (Keycloak y Apache Kafka)

### Paso 1: Obtener el Token de Acceso JWT desde Keycloak

Los endpoints protegidos de la API requieren un token Bearer firmado por Keycloak que contenga los roles de acceso correspondientes (`STUDENT`, `REVIEWER`, `ADMINISTRATOR`, etc.).

#### Opción A: Usando cURL
```bash
curl -X POST "<KEYCLOAK_SERVER_URL>/realms/<KEYCLOAK_REALM>/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=<TU_CLIENT_ID>" \
  -d "username=<TU_USUARIO>" \
  -d "password=<TU_PASSWORD>" \
  -d "grant_type=password"
```

*(Si utilizas un cliente confidencial con `client_credentials`, envía `client_id`, `client_secret` y `grant_type=client_credentials`).*

De la respuesta JSON obtenida, copia el valor del campo `access_token`.

#### Opción B: Usando Postman
1. Crea una nueva petición de tipo `POST` con la URL:
   `<KEYCLOAK_SERVER_URL>/realms/<KEYCLOAK_REALM>/protocol/openid-connect/token`
2. En la pestaña **Body**, selecciona el formato `x-www-form-urlencoded`.
3. Agrega las claves requeridas:
   - `client_id`: `<TU_CLIENT_ID>`
   - `username`: `<TU_USUARIO>`
   - `password`: `<TU_PASSWORD>`
   - `grant_type`: `password`
4. Envía la solicitud y copia el valor de `access_token`.

---

### Paso 2: Autenticarse y Consumir los Endpoints

#### Probar desde Swagger UI (`http://localhost:8000/docs`)
1. Abre tu navegador y navega a `http://localhost:8000/docs`.
2. Haz clic en el botón **Authorize** (ícono de candado 🔒 situado en la esquina superior derecha).
3. En la ventana emergente, ingresa el token en el campo **Value**:
   ```text
   Bearer <TU_ACCESS_TOKEN>
   ```
4. Presiona **Authorize** y luego **Close**.
5. Despliega un endpoint según los permisos asignados a tu usuario (por ejemplo, `POST /v1/requests/validate`), haz clic en **Try it out**, ingresa el cuerpo JSON de prueba y haz clic en **Execute**:

```json
{
  "type": "CREDIT_TRANSFER",
  "student": {
    "student_code": "123456",
    "name": "Estudiante de Prueba",
    "email": "estudiante@example.edu"
  },
  "academic_data": {
    "source_course": "Materia A",
    "target_course": "Materia B",
    "source_credits": 3,
    "target_credits": 3
  },
  "documents": []
}
```

6. La API responderá con código `200 OK` (o `201 Created` en `/prepare`), retornando el `actor` extraído del token JWT (`sub`).

#### Probar desde Postman o cURL
Incluye el encabezado `Authorization` con el esquema Bearer:

```bash
curl -X POST "http://localhost:8000/v1/requests/validate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TU_ACCESS_TOKEN>" \
  -d '{
    "type": "CREDIT_TRANSFER",
    "student": {
      "student_code": "123456",
      "name": "Estudiante de Prueba",
      "email": "estudiante@example.edu"
    },
    "academic_data": {
      "source_course": "Materia A",
      "target_course": "Materia B",
      "source_credits": 3,
      "target_credits": 3
    },
    "documents": []
  }'
```

---

### Paso 3: Verificar la Emisión de Eventos en Kafka

Gracias al mecanismo de entrega síncrona `flush()` implementado en `kafka_producer.py`, el evento se transmite y confirma con el broker antes de que la función Lambda concluya su ciclo de ejecución.

1. **Revisión en los Logs del Servidor**:
   Al completarse exitosamente una petición en cualquier endpoint protegido, revisa la terminal (sea en los logs del contenedor SAM o de Uvicorn). Verás el registro de confirmación del evento:
   ```text
   [INFO] [kafka_producer]: Evento 'RequestValidated' publicado en tópico '<TOPICO_KAFKA>' [Partición: 0, Offset: 15, Actor: <ID_DEL_ACTOR>]
   ```

2. **Formato del Evento Publicado**:
   El evento producido en el tópico de Apache Kafka contiene la siguiente estructura estricta:
   ```json
   {
     "event_type": "RequestValidated",
     "actor": "<ID_DEL_ACTOR_EXTRAIDO_DEL_TOKEN>",
     "timestamp": "<TIMESTAMP_UTC_ISO8601>",
     "data": { ... }
   }
   ```
