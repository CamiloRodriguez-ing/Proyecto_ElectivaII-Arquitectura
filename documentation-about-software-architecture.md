# Guía de arquitectura e implementación serverless

## Sistema de solicitudes estudiantiles

Versión documental para la primera etapa del proyecto. Esta guía no implementa el proyecto ni entrega un repositorio de código. Define el alcance, la arquitectura, los contratos y el proceso que debe seguirse cuando se autorice la implementación.

## 1. Interpretación del proyecto

El documento **Pautas de la Página de Software** describe un sistema para gestionar solicitudes académicas, especialmente homologaciones, con participación de estudiantes y administradores. Sus funciones centrales son:

- Preparar y registrar solicitudes académicas.
- Validar los datos de una solicitud.
- Consultar y seguir su estado.
- Permitir que un administrador revise, apruebe, rechace o devuelva una solicitud.
- Producir notificaciones ante cambios de estado.
- Generar reportes e indicadores.
- Mantener historial y trazabilidad.

La arquitectura original del documento menciona bases de datos, archivos adjuntos, RabbitMQ, correo, autenticación, integración con el sistema académico y otros componentes. Esas menciones son requisitos o ideas del documento de referencia; **no se incorporan en esta primera etapa**, porque el alcance solicitado está limitado a:

- AWS Lambda.
- Amazon API Gateway.
- Python para el backend.
- Un monorepositorio para el backend.
- Un frontend que puede residir en otro repositorio.

No se incorporan actualmente S3, Cognito, SQS, bases de datos, Kafka, RabbitMQ, SES, WebSockets, cachés ni integraciones institucionales.

## 2. Consecuencia técnica de no tener persistencia

AWS Lambda es un servicio de ejecución, no una base de datos. La memoria y el sistema de archivos temporal de una invocación no se pueden tratar como almacenamiento permanente. Por tanto, con Lambda y API Gateway solamente:

- Sí se puede recibir, validar, normalizar y transformar una solicitud.
- Sí se pueden ejecutar reglas de transición de estados.
- Sí se puede construir el contenido de una notificación.
- Sí se pueden calcular indicadores a partir de datos enviados en la misma petición.
- No se puede conservar una solicitud de forma confiable entre invocaciones.
- No se puede implementar realmente `GET /v1/requests/{id}` ni un historial persistente.
- No se pueden almacenar documentos adjuntos. En esta etapa solo se admite su **metadato**, por ejemplo nombre, tipo y tamaño.
- No se pueden mantener usuarios, contraseñas ni sesiones de producción.
- No se puede entregar un correo sin incorporar otro servicio o proveedor.

La primera versión debe ser deliberadamente **sin estado**. Cada operación recibe toda la información que necesita y devuelve el resultado calculado. Esto permite demostrar servicios Lambda individuales y reglas de negocio sin fingir que existe persistencia.

## 3. Alcance de la primera versión

### 3.1 Incluido

1. API HTTP versionada mediante API Gateway.
2. Funciones Lambda independientes por capacidad de negocio.
3. Validación de solicitudes.
4. Normalización y preparación de una solicitud para envío.
5. Evaluación administrativa y transición de estado.
6. Generación del contenido de una notificación, sin enviarla.
7. Cálculo de un resumen analítico a partir de solicitudes incluidas en la petición.
8. Contratos JSON y errores uniformes.
9. Pruebas unitarias, de contrato y locales.
10. Infraestructura como código con AWS SAM.

### 3.2 Excluido

- Persistencia de solicitudes, usuarios, estados o notificaciones.
- Carga o descarga real de documentos.
- Autenticación y autorización de producción.
- Envío de correos o mensajes.
- Procesamiento asíncrono.
- Integración con SGA u otros sistemas institucionales.
- Kafka, RabbitMQ o SQS.
- Hosting del frontend en AWS.
- S3 como almacenamiento de la aplicación.
- Reportes PDF o Excel persistentes.

### 3.3 Criterio de éxito

La etapa se considera terminada cuando cada capacidad puede invocarse de forma independiente por HTTP, aplica sus reglas, devuelve un contrato estable y cuenta con pruebas. No se debe presentar esta versión como un sistema productivo ni como un CRUD completo.

## 4. Arquitectura actual

```text
Frontend running locally or hosted outside this scope
                     |
                  HTTPS
                     |
             Amazon API Gateway
                     |
       +-------------+-------------+
       |             |             |
   Lambda         Lambda        Lambda
  requests       reviews     notifications
       |             |             |
       +-------------+-------------+
                     |
                  Lambda
                 analytics

No shared storage.
No asynchronous communication.
No Lambda-to-Lambda invocation.
```

Se recomienda **API Gateway HTTP API** con integración Lambda proxy y formato de carga `2.0`. El evento recibido por la Lambda y la respuesta deben aislarse en un adaptador HTTP para evitar que la lógica de negocio dependa de AWS.

### Decisiones de arquitectura

- Una Lambda por capacidad de negocio, no una Lambda por cada función Python.
- Un único API Gateway con rutas versionadas bajo `/v1`.
- Comunicación síncrona HTTP únicamente desde el cliente.
- Lógica de dominio pura y reutilizable.
- Handlers delgados: traducen HTTP, llaman un caso de uso y convierten el resultado a HTTP.
- Ninguna Lambda debe llamar directamente a otra. Si dos servicios necesitan la misma regla, esta se ubica en una librería compartida.
- Los contratos HTTP son la frontera estable. La infraestructura futura no debe cambiar el significado de esos contratos.

## 5. Servicios Lambda propuestos

| Lambda | Responsabilidad actual | Rutas |
|---|---|---|
| `health-service` | Confirmar versión y disponibilidad de la API | `GET /v1/health` |
| `requests-service` | Validar y preparar solicitudes | `POST /v1/requests/validate`, `POST /v1/requests/prepare` |
| `reviews-service` | Aplicar decisiones y transiciones de estado | `POST /v1/reviews/evaluate` |
| `notifications-service` | Construir una notificación a partir de un evento | `POST /v1/notifications/preview` |
| `analytics-service` | Calcular indicadores desde un conjunto recibido en el cuerpo | `POST /v1/analytics/summary` |

No se propone todavía una Lambda de usuarios o autenticación. Sin una fuente confiable de identidades y sin almacenamiento, solo podría ser una simulación insegura. Durante desarrollo se pueden usar cabeceras como `X-Demo-User-Id` y `X-Demo-Role`, pero únicamente en modo local o académico y nunca como mecanismo de seguridad.

## 6. Modelo de dominio mínimo

### 6.1 Solicitud

```json
{
  "request_id": "uuid-generated-by-the-service",
  "idempotency_key": "client-provided-value",
  "student": {
    "student_code": "202012345",
    "name": "Student name",
    "email": "student@university.edu.co"
  },
  "type": "CREDIT_TRANSFER",
  "academic_data": {
    "source_course": "Calculus I",
    "target_course": "Differential Calculus",
    "source_credits": 3,
    "target_credits": 3
  },
  "documents": [
    {
      "name": "course_syllabus.pdf",
      "mime_type": "application/pdf",
      "size_bytes": 120000
    }
  ],
  "status": "SUBMITTED",
  "observations": [],
  "created_at": "2026-08-21T15:00:00Z",
  "updated_at": "2026-08-21T15:00:00Z",
  "version": 1
}
```

El campo `documents` contiene metadatos, no contenido ni rutas ficticias. La carga real se diseñará cuando se autorice almacenamiento.

### 6.2 Estados

```text
DRAFT
   |
   v
SUBMITTED --> CANCELLED
   |
   v
UNDER_REVIEW
   |          |             |
   v          v             v
APPROVED   REJECTED   CHANGES_REQUESTED
                             |
                             v
                          SUBMITTED
```

Reglas mínimas:

- Una solicitud solo puede evaluarse si está `SUBMITTED` o `UNDER_REVIEW`.
- `APPROVED`, `REJECTED` y `CANCELLED` son estados terminales para esta fase.
- Toda evaluación debe incluir actor, fecha, decisión y observación.
- Una respuesta nunca modifica silenciosamente la versión recibida; devuelve una copia con `version + 1`.
- El servicio rechaza transiciones no permitidas con `409 STATE_TRANSITION_NOT_ALLOWED`.

## 7. Contratos HTTP

### 7.1 Respuesta exitosa

```json
{
  "data": {},
  "meta": {
    "request_id": "correlation-id",
    "api_version": "v1",
    "timestamp": "2026-08-21T15:00:00Z"
  }
}
```

### 7.2 Respuesta de error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data",
    "details": [
      {
        "field": "student.email",
        "reason": "A university email address is required"
      }
    ]
  },
  "meta": {
    "request_id": "correlation-id",
    "api_version": "v1"
  }
}
```

### 7.3 Códigos HTTP

| Código | Uso |
|---|---|
| `200` | Validación, evaluación o cálculo realizado |
| `201` | Representación de solicitud preparada; no significa que haya sido persistida |
| `400` | JSON mal formado o petición incompleta |
| `409` | Transición de estado no permitida |
| `422` | Datos con formato válido pero reglas de negocio incumplidas |
| `500` | Error interno no esperado |

### 7.4 Operaciones

#### `POST /v1/requests/validate`

Recibe una solicitud sin estado, ejecuta reglas y devuelve:

```json
{
  "data": {
    "valid": true,
    "errors": [],
    "warnings": ["Files are represented only by metadata at this stage"]
  },
  "meta": {}
}
```

Validaciones sugeridas:

- Código, nombre y correo del estudiante obligatorios.
- Tipo de solicitud incluido en un catálogo interno versionado.
- Campos académicos requeridos según el tipo.
- Metadatos de documentos requeridos según la regla del tipo.
- Tamaño y MIME permitidos evaluados solo sobre los metadatos declarados.
- Prohibición de campos inesperados en contratos estrictos.

#### `POST /v1/requests/prepare`

Valida, normaliza mayúsculas y espacios, genera un UUID y devuelve una representación con estado `SUBMITTED`. La respuesta no queda guardada. El frontend debe conservarla durante la demostración o enviarla completa a la siguiente operación.

#### `POST /v1/reviews/evaluate`

Entrada:

```json
{
  "request": { "status": "UNDER_REVIEW", "version": 2 },
  "evaluation": {
    "decision": "APPROVE",
    "observation": "The request meets all requirements",
    "actor": {
      "id": "admin-demo",
      "role": "ADMINISTRATOR"
    }
  }
}
```

Salida: copia actualizada de la solicitud y un evento de dominio, sin publicar.

```json
{
  "data": {
    "request": {
      "status": "APPROVED",
      "version": 3
    },
    "event": {
      "event_type": "request.status_changed.v1",
      "aggregate_type": "request",
      "aggregate_id": "uuid",
      "occurred_at": "2026-08-21T15:05:00Z",
      "data": {
        "previous_status": "UNDER_REVIEW",
        "new_status": "APPROVED"
      }
    }
  },
  "meta": {}
}
```

El evento se devuelve en HTTP para demostrar el desacoplamiento futuro. En la etapa Kafka será publicado por un adaptador.

#### `POST /v1/notifications/preview`

Recibe el evento anterior y datos mínimos del destinatario. Devuelve asunto, cuerpo y canal sugerido. No envía nada.

#### `POST /v1/analytics/summary`

Recibe una lista limitada de solicitudes y calcula:

- Total por tipo.
- Total por estado.
- Porcentaje de aprobación y rechazo.
- Tiempo medio de resolución cuando haya fechas suficientes.
- Cantidad de solicitudes que requieren ajustes.

El límite del número y tamaño del cuerpo debe definirse explícitamente. Esta operación es para demostración; no sustituye una base analítica.

## 8. Estructura del monorepositorio backend

```text
student-requests-backend/
|-- README.md
|-- pyproject.toml
|-- requirements.txt
|-- template.yaml
|-- samconfig.toml
|-- .gitignore
|-- docs/
|   |-- architecture.md
|   |-- api.md
|   |-- decisions/
|   |   |-- ADR-001-serverless-lambda-api-gateway.md
|   |   |-- ADR-002-stateless-first-stage.md
|   |   `-- ADR-003-contract-first.md
|   `-- openapi.yaml
|-- src/
|   |-- __init__.py
|   |-- functions/
|   |   |-- health/
|   |   |   `-- handler.py
|   |   |-- requests/
|   |   |   `-- handler.py
|   |   |-- reviews/
|   |   |   `-- handler.py
|   |   |-- notifications/
|   |   |   `-- handler.py
|   |   `-- analytics/
|   |       `-- handler.py
|   `-- shared/
|       |-- domain/
|       |   |-- entities.py
|       |   |-- enums.py
|       |   |-- errors.py
|       |   `-- rules.py
|       |-- application/
|       |   |-- prepare_request.py
|       |   |-- evaluate_request.py
|       |   |-- preview_notification.py
|       |   `-- summarize_requests.py
|       |-- contracts/
|       |   |-- requests.py
|       |   |-- responses.py
|       |   `-- events.py
|       `-- adapters/
|           `-- http_api_v2.py
|-- tests/
|   |-- unit/
|   |-- contract/
|   `-- integration/
|-- events/
|   |-- validate-request.json
|   |-- evaluate-request.json
|   `-- analytics-request.json
`-- scripts/
    `-- smoke-test.ps1
```

### Idioma obligatorio de los artefactos técnicos

La explicación académica de esta guía permanece en español. Sin embargo, todo lo que forme parte del repositorio o de un contrato técnico debe escribirse en inglés:

- Nombres de archivos, carpetas, módulos, clases, funciones, variables y constantes.
- Rutas HTTP, parámetros, cabeceras propias, campos JSON y valores de enumeraciones.
- Códigos y mensajes de error devueltos por la API.
- Eventos, tópicos, logs y nombres de métricas.
- Comentarios, docstrings y anotaciones técnicas dentro del código.
- Nombres y descripciones de pruebas, fixtures y datos de ejemplo.
- `README.md`, documentación de arquitectura, ADR, OpenAPI, instrucciones de despliegue y guías de operación.
- Títulos, descripciones, ejemplos y esquemas incluidos en OpenAPI.

La única excepción posible es el texto visible para usuarios finales. Si la interfaz debe presentarse en español, esas cadenas deben estar separadas del código mediante archivos de internacionalización, por ejemplo `locales/es.json`. Los identificadores usados para esas traducciones también deben estar en inglés.

### Por qué esta distribución

- `src/functions` contiene exclusivamente entradas de AWS.
- `src/shared/domain` no importa `boto3` ni tipos de API Gateway.
- `src/shared/application` coordina casos de uso.
- `src/shared/contracts` mantiene los esquemas externos y los eventos versionados.
- `src/shared/adapters` traduce eventos de API Gateway formato `2.0` a objetos del dominio.
- `tests/unit` prueba reglas sin AWS ni Docker.
- `tests/contract` garantiza que las respuestas respeten OpenAPI.
- `events` permite invocar Lambdas localmente con casos repetibles.

Para la etapa académica, todas las funciones pueden usar `CodeUri: .` y handlers distintos. Cada recurso desplegado sigue siendo una Lambda independiente, aunque SAM empaquete la misma base de código para cada una. Cuando crezca el proyecto se podrá adoptar un proceso de construcción que genere artefactos mínimos por servicio.

## 9. Organización interna de cada Lambda

El handler debe tener solo cuatro responsabilidades:

1. Obtener cuerpo, ruta, cabeceras y `requestContext`.
2. Validar el contrato de entrada.
3. Ejecutar un caso de uso.
4. Devolver el contrato HTTP uniforme.

Flujo recomendado:

```text
API Gateway event
      |
HTTP adapter
      |
Input contract
      |
Application use case
      |
Pure domain rules
      |
Output contract
      |
API Gateway response
```

Los handlers no deben contener reglas como “una solicitud aprobada no puede volver a revisión”. Esa regla pertenece al dominio y debe poder probarse sin simular AWS.

## 10. Infraestructura como código

El archivo `template.yaml` debe declarar únicamente recursos de aplicación Lambda y API Gateway. Ejemplo documental reducido:

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: python3.12
    Architectures: [x86_64]
    Timeout: 10
    MemorySize: 256
    Environment:
      Variables:
        APP_ENV: dev
        LOG_LEVEL: INFO
        DEMO_MODE: "true"

Resources:
  AcademicRequestsApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      StageName: $default
      CorsConfiguration:
        AllowOrigins:
          - http://localhost:5173
        AllowMethods: [GET, POST, OPTIONS]
        AllowHeaders: [Content-Type, X-Request-Id, X-Demo-User-Id, X-Demo-Role]

  RequestsFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: .
      Handler: src.functions.requests.handler.lambda_handler
      Events:
        ValidateRequest:
          Type: HttpApi
          Properties:
            ApiId: !Ref AcademicRequestsApi
            Path: /v1/requests/validate
            Method: POST
            PayloadFormatVersion: "2.0"
        PrepareRequest:
          Type: HttpApi
          Properties:
            ApiId: !Ref AcademicRequestsApi
            Path: /v1/requests/prepare
            Method: POST
            PayloadFormatVersion: "2.0"
```

El resto de las funciones sigue el mismo patrón. No deben declararse buckets, colas, tablas, brokers ni proveedores de identidad.

### Aclaración sobre SAM y S3

Aunque la aplicación no use S3, el proceso estándar de `sam deploy` para paquetes ZIP puede utilizar un bucket de artefactos como mecanismo interno de despliegue. Ese bucket no forma parte de la arquitectura funcional ni es accedido por el sistema. Si la restricción académica significa “no usar S3 en la solución”, SAM sigue siendo válido. Si significa “no permitir que exista ningún bucket ni siquiera para despliegue”, se debe confirmar con el docente, porque esa condición limita el flujo normal de despliegue automatizado.

## 11. Dependencias Python

Mantener pocas dependencias:

- Una librería de validación y serialización, por ejemplo Pydantic, si el equipo acepta la dependencia.
- `pytest` para pruebas.
- `boto3` no es necesario en la primera etapa porque no se llama a otros servicios AWS.

El dominio no debe depender de Pydantic. Los modelos externos se transforman a tipos de dominio para evitar que los contratos HTTP gobiernen todas las reglas internas.

Convenciones:

- Python con tipado estático en funciones públicas.
- UTC e ISO 8601 para fechas.
- UUID para identificadores temporales.
- Enumeraciones para tipos y estados.
- JSON estructurado para logs.
- Ningún secreto en Git ni en variables de ejemplo.
- No registrar cuerpos completos si contienen información personal.

## 12. Proceso de implementación

### Paso 1. Congelar contratos

Antes de programar, acordar:

- Tipos de solicitud de la demostración.
- Campos obligatorios de cada tipo.
- Estados y transiciones.
- Decisiones del administrador.
- Formato de errores.
- Datos personales que no deben registrarse en logs.

Crear `docs/openapi.yaml` y ejemplos JSON. La interfaz y el backend deben trabajar contra el mismo contrato.

### Paso 2. Crear el esqueleto del monorepositorio

Crear las carpetas anteriores, configurar Python, linters y pruebas. No empezar por AWS. Primero debe ser posible ejecutar las reglas como funciones Python ordinarias.

### Paso 3. Implementar el dominio

Orden sugerido:

1. Enumeraciones y errores.
2. Entidad `Request`.
3. Validador por tipo de solicitud.
4. Máquina de estados.
5. Evento `request.status_changed.v1`.
6. Cálculo de indicadores.

### Paso 4. Implementar casos de uso

Cada caso de uso recibe objetos explícitos y devuelve un resultado, sin conocer API Gateway:

```text
validate_request(input) -> ValidationResult
prepare_request(input, clock, id_generator) -> RequestPrepared
evaluate_request(request, decision, actor, clock) -> RequestEvaluated
preview_notification(event, recipient) -> NotificationPreview
summarize_requests(requests) -> AnalyticsSummary
```

El reloj y el generador de UUID se pasan como dependencias para que las pruebas sean deterministas.

### Paso 5. Implementar adaptadores HTTP

Añadir el parseo del evento API Gateway v2, respuestas, CORS y `request_id`. Todas las excepciones conocidas se traducen a códigos de error estables.

### Paso 6. Declarar las Lambdas en SAM

Añadir una ruta por operación. Evitar el proxy genérico `ANY /{proxy+}` porque dificulta ver los servicios individuales y sus contratos en una entrega académica.

### Paso 7. Probar

Pruebas mínimas:

- Solicitud válida e inválida por tipo.
- Campos ausentes y campos inesperados.
- Cada transición permitida.
- Cada transición prohibida.
- Cálculo de versiones.
- Evento generado tras una evaluación.
- Previsualización de notificación.
- Analítica con lista vacía, un elemento y varios estados.
- Contratos de error.
- CORS desde el origen del frontend local.

### Paso 8. Ejecutar localmente

Flujo orientativo:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest
sam validate --lint
sam build
sam local start-api
```

`sam local` requiere Docker. Para una invocación individual:

```powershell
sam local invoke RequestsFunction --event events\validate-request.json
```

### Paso 9. Desplegar

Primera vez:

```powershell
sam build
sam deploy --guided
```

Despliegues posteriores:

```powershell
sam build
sam deploy
```

Separar, como mínimo, configuraciones `dev` y `prod`, aunque inicialmente solo se despliegue `dev`.

### Paso 10. Hacer pruebas de humo

El script `scripts/smoke-test.ps1` debe llamar a todas las rutas con ejemplos controlados y comprobar código HTTP, tipo de contenido, `request_id` y campos principales.

## 13. Estrategia de pruebas y calidad

| Nivel | Qué comprueba | Usa AWS |
|---|---|---|
| Unitario | Reglas, estados, normalización, indicadores | No |
| Contrato | JSON de entrada/salida contra OpenAPI | No |
| Integración local | Handler y evento API Gateway v2 | Simulado por SAM |
| Humo desplegado | Rutas reales y CORS | Sí, solo API Gateway y Lambda |

Metas razonables:

- Cobertura alta en dominio, sin convertir el porcentaje en el único criterio.
- Cero llamadas de red en pruebas unitarias.
- Casos de error tan documentados como los casos exitosos.
- Tiempo de respuesta medido, pero sin afirmar el requisito de menos de dos segundos hasta probarlo en AWS.

## 14. Observabilidad dentro del alcance

Lambda produce logs de ejecución como parte de su funcionamiento administrado. La aplicación debe escribir JSON por línea con:

- `request_id`.
- `service`.
- `operation`.
- `result`.
- `duration_ms`.
- Código de error, si existe.

No registrar nombres, correos, documentos ni cuerpos completos. En esta etapa no se declara infraestructura adicional de monitoreo. La trazabilidad de negocio persistente queda pendiente de la base de datos.

## 15. Frontend en repositorio separado

Repositorio sugerido:

```text
student-requests-frontend/
|-- src/
|   |-- app/
|   |-- pages/
|   |   |-- RequestFormPage.tsx
|   |   |-- RequestReviewDemoPage.tsx
|   |   `-- AnalyticsPage.tsx
|   |-- features/
|   |   |-- requests/
|   |   |-- reviews/
|   |   `-- analytics/
|   |-- api/
|   |   |-- client.ts
|   |   `-- generated/
|   |-- components/
|   `-- config/
|-- .env.example
|-- package.json
`-- README.md
```

Recomendación: React, TypeScript y Vite. El cliente debe generarse o tiparse a partir de `openapi.yaml` para reducir diferencias entre frontend y backend.

Flujo de demostración sin base de datos:

1. El formulario llama a `/v1/requests/validate`.
2. Si es válido, llama a `/v1/requests/prepare`.
3. El frontend conserva la respuesta en memoria o `sessionStorage` únicamente para la demostración.
4. La pantalla administrativa envía la solicitud completa a `/v1/reviews/evaluate`.
5. Usa el evento devuelto para llamar a `/v1/notifications/preview`.
6. Envía una colección de demostración a `/v1/analytics/summary`.

`sessionStorage` no reemplaza la base de datos y debe identificarse visualmente como modo demostración. El hosting del frontend no se cubre en esta etapa; puede ejecutarse localmente o en una plataforma decidida aparte.

## 16. Evolución futura: base de datos

El documento de referencia propone un modelo relacional y las entidades tienen relaciones claras. Cuando se autorice persistencia, PostgreSQL es una opción coherente para solicitudes, historial, usuarios, tipos, estados y notificaciones.

### Preparación que debe existir desde ahora

Definir puertos, sin implementar un repositorio real:

```text
RequestRepository
  get_by_id(id)
  save(request)
  list_by_student(student_id, filters)

UnitOfWork
  begin()
  commit()
  rollback()

EventPublisher
  publish(events)
```

En la etapa actual no se usa un repositorio en memoria para simular persistencia entre invocaciones. Los casos de uso sin estado no llaman todavía a `RequestRepository`. Cuando llegue la base de datos se crea un adaptador PostgreSQL sin trasladar SQL al dominio.

### Esquema inicial futuro

- `users`.
- `roles`.
- `request_types`.
- `requests`.
- `request_status_history`.
- `request_observations`.
- `notification_records`.
- `attachment_metadata`.
- `outbox_events`, cuando se adopte Kafka.

Aspectos a resolver entonces:

- Migraciones versionadas.
- Índices por estudiante, estado, tipo y fecha.
- Control de concurrencia optimista mediante `version`.
- Idempotencia mediante `idempotency_key`.
- Transacciones para guardar solicitud e historial juntos.
- Política real de documentos adjuntos; una ruta inventada no es una solución.
- Gestión segura de credenciales y conexiones.

## 17. Evolución futura: Kafka

Kafka no debe agregarse hasta que exista una necesidad concreta de desacoplar procesos o manejar eventos de forma asíncrona. El diseño actual se prepara mediante eventos de dominio y el puerto `EventPublisher`.

### Evento estándar

```json
{
  "event_id": "uuid",
  "event_type": "request.status_changed.v1",
  "aggregate_type": "request",
  "aggregate_id": "request-uuid",
  "occurred_at": "2026-08-21T15:05:00Z",
  "correlation_id": "request-id",
  "schema_version": 1,
  "data": {
    "previous_status": "UNDER_REVIEW",
    "new_status": "APPROVED"
  }
}
```

### Migración gradual

1. Mantener los eventos como objetos internos y respuestas de demostración.
2. Incorporar base de datos.
3. Guardar la modificación y el evento en una misma transacción mediante patrón outbox.
4. Añadir un publicador que lea la outbox y publique en Kafka.
5. Convertir notificaciones, auditoría y analítica en consumidores.
6. Mantener las rutas HTTP y contratos externos estables.
7. Añadir reintentos, claves de partición, consumidores idempotentes y gestión de mensajes fallidos según la plataforma elegida.

Tópicos posibles:

- `academic-requests.request-created.v1`.
- `academic-requests.request-state-changed.v1`.
- `academic-requests.request-cancelled.v1`.

La clave de partición debe ser `request_id` para mantener el orden de eventos de una misma solicitud. Los consumidores no deben depender del orden global.

## 18. Evolución futura: análisis de datos

No se recomienda iniciar con modelos predictivos. Primero se debe asegurar calidad, volumen y trazabilidad de los datos.

### Etapa actual

La Lambda analítica recibe una colección en la petición y calcula indicadores deterministas. Sirve para comprobar las fórmulas y el contrato.

### Después de la base de datos

1. Definir métricas con significado institucional.
2. Corregir valores faltantes, duplicados y estados inconsistentes.
3. Crear un modelo de lectura para reportes, separado de las escrituras operativas.
4. Calcular métricas por periodo, programa, tipo y estado.
5. Validar resultados con usuarios administrativos.

Indicadores iniciales:

- Tiempo medio y mediano de resolución.
- Solicitudes por tipo y periodo.
- Porcentaje de aprobación, rechazo y ajustes.
- Solicitudes vencidas según plazo configurado.
- Cantidad de devoluciones por solicitud.
- Carga de revisión por administrador, si la normativa permite ese análisis.

### Después de Kafka

Un consumidor puede construir proyecciones analíticas a partir de eventos sin hacer consultas pesadas al sistema transaccional. La analítica debe tolerar eventos duplicados mediante `event_id` y reconocer que una proyección puede tener consistencia eventual.

## 19. Trazabilidad de requisitos

| Requisito del documento | Primera etapa | Futuro |
|---|---|---|
| RF-01 Registrar solicitud | Preparar y devolver representación; no persistir | Guardar en base de datos |
| RF-02 Gestionar usuarios | No incluido | Identidad y roles reales |
| RF-03 Revisar solicitudes | Regla y transición sin estado | Persistencia, historial y concurrencia |
| RF-04 Generar reportes | Resumen JSON de datos recibidos | Consultas, PDF/Excel y proyecciones |
| RF-05 Notificaciones | Previsualizar contenido | Publicación de evento y entrega real |
| RF-06 Consultar estado | Solo sobre representación enviada por cliente | Consulta por identificador |
| RF-07 Historial | No persistente | Tabla de historial/eventos |
| RF-08 Validación | Incluido | Catálogos institucionales |
| RF-09 Autenticación segura | No incluida | Proveedor de identidad autorizado |
| RF-10 Parámetros | Catálogo versionado en código | Configuración persistente administrable |

## 20. Plan de entregas

### Entrega 1: contratos y dominio

- OpenAPI.
- Estados y reglas.
- Casos de uso puros.
- Pruebas unitarias.

### Entrega 2: Lambdas locales

- Cinco handlers.
- Eventos de prueba.
- Respuestas uniformes.
- `sam local start-api`.

### Entrega 3: despliegue académico

- API Gateway HTTP API.
- Cinco Lambdas.
- CORS para frontend local.
- Pruebas de humo.
- Sin recursos de aplicación adicionales.

### Entrega 4: frontend demostrativo

- Formulario.
- Flujo de evaluación.
- Previsualización de notificación.
- Panel analítico básico.
- Aviso visible de modo sin persistencia.

## 21. Lista de verificación de alcance

Antes de aprobar un cambio en esta fase:

- [ ] Solo se declararon API Gateway y funciones Lambda como recursos funcionales.
- [ ] No existe bucket S3 de la aplicación.
- [ ] No existe Cognito.
- [ ] No existe SQS, Kafka ni RabbitMQ.
- [ ] No existe base de datos.
- [ ] Ninguna respuesta afirma que un dato fue guardado.
- [ ] Los adjuntos son solo metadatos.
- [ ] Las notificaciones se previsualizan, no se envían.
- [ ] No se usa una cabecera de demostración como seguridad de producción.
- [ ] Cada regla relevante tiene prueba.
- [ ] El frontend consume el contrato versionado.

## 22. Decisiones que deben confirmarse antes de implementar

Estas decisiones no impiden definir la arquitectura, pero sí afectan la implementación concreta:

1. Tipos exactos de solicitud que entrarán en la demostración.
2. Campos obligatorios y documentos requeridos por cada tipo.
3. Estados finales aceptados por la materia.
4. Si se demostrará un rol docente además de estudiante y administrador.
5. Región AWS y versión de Python admitida por la cuenta del curso.
6. Si el docente permite el bucket técnico que AWS SAM usa para artefactos de despliegue.
7. Tamaño máximo de la colección enviada a la Lambda analítica.

## 23. Prompt para solicitar la implementación a otra IA

```text
Actúa como arquitecto y desarrollador senior de Python y AWS serverless.

Debes implementar un monorepositorio backend para un sistema académico de solicitudes estudiantiles. Lee primero toda la especificación proporcionada y respeta estrictamente estas restricciones:

1. La arquitectura funcional de esta etapa solo puede usar AWS Lambda y Amazon API Gateway HTTP API.
2. No agregues S3, Cognito, SQS, SNS, SES, DynamoDB, RDS, Kafka, RabbitMQ, EventBridge, Step Functions, WebSockets ni ningún otro servicio de aplicación.
3. Usa Python y AWS SAM.
4. REGLA OBLIGATORIA DE IDIOMA: todo el contenido generado para el repositorio debe estar escrito en inglés. Esto incluye código fuente, identificadores, nombres de archivos y carpetas, rutas HTTP, campos JSON, enumeraciones, eventos, mensajes de error, logs, comentarios, docstrings, nombres y descripciones de pruebas, fixtures, ejemplos, README, OpenAPI, ADR, diagramas, documentación de arquitectura, instrucciones de despliegue y documentación operativa. No escribas texto en español dentro del repositorio, salvo cadenas de interfaz separadas en archivos de internacionalización si se solicitan explícitamente.
5. El sistema es deliberadamente sin estado. No simules persistencia entre invocaciones y no afirmes que una solicitud fue guardada.
6. Los documentos adjuntos se representan únicamente con metadatos; no se cargan archivos.
7. Las notificaciones solo se previsualizan; no se envían.
8. La autenticación real queda fuera de alcance. Las cabeceras demo, si se usan, deben estar claramente marcadas como inseguras y exclusivas de desarrollo.
9. No invoques una Lambda desde otra Lambda.
10. Separa handlers, casos de uso, dominio, contratos y adaptadores HTTP.
11. Mantén contratos versionados bajo /v1 y usa el formato de evento API Gateway payload 2.0.
12. La documentación debe ser detallada y suficiente para que otro desarrollador pueda instalar, ejecutar, probar, desplegar, operar y extender el sistema sin depender de explicaciones externas.

Implementa estas funciones independientes:
- health-service: expose API health and version information
- requests-service: validate and prepare requests
- reviews-service: evaluate requests and enforce status transitions
- notifications-service: build a notification preview from a domain event
- analytics-service: summarize a request collection received in the HTTP payload

Usa exactamente estas rutas en inglés:
- GET /v1/health
- POST /v1/requests/validate
- POST /v1/requests/prepare
- POST /v1/reviews/evaluate
- POST /v1/notifications/preview
- POST /v1/analytics/summary

Usa esta máquina de estados, conservando exactamente estos identificadores en inglés:
DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED | REJECTED | CHANGES_REQUESTED
SUBMITTED -> CANCELLED
CHANGES_REQUESTED -> SUBMITTED

Entrega de forma incremental:
A. Propón primero, en inglés, el árbol del monorepositorio, las decisiones de arquitectura y el OpenAPI completo. Detente para revisión.
B. Después implementa el dominio, docstrings y pruebas unitarias documentadas en inglés. Detente para revisión.
C. Después implementa handlers, adaptadores HTTP y template.yaml, incluyendo documentación técnica en inglés. Detente para revisión.
D. Finalmente añade pruebas de contrato, eventos locales, README, ADR, comandos SAM y guías de operación, todo detallado y escrito en inglés.

Para cada etapa explica qué archivos crearás antes de crearlos. Esa explicación y todos los archivos generados deben estar en inglés. No introduzcas servicios futuros. Deja puertos o interfaces para RequestRepository y EventPublisher, pero no implementes base de datos ni Kafka.

La documentación en inglés debe incluir como mínimo:
- A root README with prerequisites, setup, local execution, testing, build, deployment, troubleshooting and project structure.
- A complete OpenAPI specification with descriptions, examples, schemas, status codes and error responses.
- Architecture documentation explaining boundaries, request flows, stateless limitations and extension points.
- ADR documents for the serverless scope, stateless design, contract-first approach and English-only technical artifacts.
- Docstrings for public modules, classes and functions, including parameters, return values, raised errors and side effects.
- Deployment and rollback instructions.
- A testing guide covering unit, contract, local integration and deployed smoke tests.
- An operations guide covering structured logs, correlation IDs, personal-data handling and known limitations.
- A future-evolution document for database, Kafka and analytics integration without implementing them now.

Criterios de aceptación:
- pytest pasa.
- sam validate --lint pasa.
- sam build pasa.
- sam local start-api permite probar todas las rutas.
- los errores tienen formato uniforme.
- ninguna operación depende de almacenamiento persistente.
- template.yaml solo declara AWS::Serverless::HttpApi y AWS::Serverless::Function como recursos funcionales.
- all technical artifacts are written in English and contain no Spanish identifiers, comments, messages or documentation.
- the English documentation covers setup, architecture, API contracts, testing, deployment, operations, troubleshooting and future extension points.
```

## 24. Referencias técnicas

- AWS SAM, proceso de compilación: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-build.html
- AWS SAM, despliegue con `sam deploy --guided`: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-deploy.html
- AWS SAM, recurso `AWS::Serverless::Function`: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- API Gateway HTTP API con integración Lambda y payload `2.0`: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
